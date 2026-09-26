import * as SQLite from 'expo-sqlite';
import { Chat, ChatMessage } from './ChatManager';

class ChatDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName = 'chat_history.db';
  private writeQueue: Promise<void> = Promise.resolve();

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.writeQueue.then(fn, fn);
    this.writeQueue = task.then(() => {}, () => {});
    return task;
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.db.execAsync('PRAGMA journal_mode = WAL');
      await this.db.execAsync('PRAGMA busy_timeout = 5000');
      await this.createTables();
      await this.migrate();
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        modelPath TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        modelName TEXT,
        thinking TEXT,
        duration INTEGER,
        tokens INTEGER,
        firstTokenTime INTEGER,
        avgTokenTime INTEGER,
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  private async migrate(): Promise<void> {
    if (!this.db) return;
    const cols = [
      { name: 'parentChatId', type: 'TEXT' },
      { name: 'branchFromMsgId', type: 'TEXT' },
      { name: 'branchPointIndex', type: 'INTEGER' },
      { name: 'forkedFromChatId', type: 'TEXT' },
      { name: 'forkPointIndex', type: 'INTEGER' },
      { name: 'createdAt', type: 'INTEGER' },
      { name: 'pinned', type: 'INTEGER' },
      { name: 'assistantId', type: 'TEXT' },
    ];
    for (const col of cols) {
      try {
        await this.db.execAsync(
          `ALTER TABLE chats ADD COLUMN ${col.name} ${col.type}`
        );
      } catch (e) {
        /* column already exists */
      }
    }

    try {
      await this.db.execAsync('ALTER TABLE messages ADD COLUMN modelName TEXT');
    } catch (e) {
      /* column already exists */
    }
  }

  async insertChat(chat: Chat): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return this.enqueue(async () => {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO chats (id, title, timestamp, modelPath, parentChatId, branchFromMsgId, branchPointIndex, forkedFromChatId, forkPointIndex, createdAt, pinned, assistantId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          chat.id,
          chat.title,
          chat.timestamp,
          chat.modelPath || null,
          chat.parentChatId || null,
          chat.branchFromMsgId || null,
          chat.branchPointIndex ?? null,
          chat.forkedFromChatId || null,
          chat.forkPointIndex ?? null,
          chat.createdAt,
          chat.pinned ? 1 : 0,
          chat.assistantId || null,
        ]
      );
    });
  }

  async insertMessage(chatId: string, message: ChatMessage): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return this.enqueue(async () => {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO messages (id, chatId, content, role, modelName, thinking, duration, tokens, firstTokenTime, avgTokenTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          message.id,
          chatId,
          message.content,
          message.role,
          message.modelName || null,
          message.thinking || null,
          message.stats?.duration || null,
          message.stats?.tokens || null,
          message.stats?.firstTokenTime || null,
          message.stats?.avgTokenTime || null,
        ]
      );
    });
  }

  async deleteChat(chatId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return this.enqueue(async () => {
      await this.db!.runAsync('DELETE FROM chats WHERE id = ?', [chatId]);
    });
  }

  async deleteAllChats(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return this.enqueue(async () => {
      await this.db!.runAsync('DELETE FROM chats');
      await this.db!.runAsync('DELETE FROM messages');
      await this.db!.runAsync('DELETE FROM app_state');
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return this.enqueue(async () => {
      await this.db!.runAsync('DELETE FROM messages WHERE id = ?', [messageId]);
    });
  }

  async getAllChats(): Promise<Chat[]> {
    if (!this.db) throw new Error('Database not initialized');

    const chatsData = await this.db.getAllAsync<{
      id: string;
      title: string;
      timestamp: number;
      modelPath: string | null;
      parentChatId: string | null;
      branchFromMsgId: string | null;
      branchPointIndex: number | null;
      forkedFromChatId: string | null;
      forkPointIndex: number | null;
      createdAt: number | null;
      pinned: number | null;
      assistantId: string | null;
    }>('SELECT * FROM chats ORDER BY timestamp DESC');

    const chats: Chat[] = [];

    for (const chatData of chatsData) {
      const messagesData = await this.db.getAllAsync<{
        id: string;
        content: string;
        role: string;
        modelName: string | null;
        thinking: string | null;
        duration: number | null;
        tokens: number | null;
        firstTokenTime: number | null;
        avgTokenTime: number | null;
      }>('SELECT * FROM messages WHERE chatId = ? ORDER BY rowid ASC', [chatData.id]);

      const messages: ChatMessage[] = messagesData.map((msg) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant' | 'system',
        modelName: msg.modelName || undefined,
        thinking: msg.thinking || undefined,
        stats: msg.duration !== null ? {
          duration: msg.duration,
          tokens: msg.tokens || 0,
          firstTokenTime: msg.firstTokenTime || undefined,
          avgTokenTime: msg.avgTokenTime || undefined,
        } : undefined,
      }));

      chats.push({
        id: chatData.id,
        title: chatData.title,
        messages,
        timestamp: chatData.timestamp,
        createdAt: chatData.createdAt ?? chatData.timestamp,
        modelPath: chatData.modelPath || undefined,
        parentChatId: chatData.parentChatId || undefined,
        branchFromMsgId: chatData.branchFromMsgId || undefined,
        branchPointIndex: chatData.branchPointIndex ?? undefined,
        forkedFromChatId: chatData.forkedFromChatId || undefined,
        forkPointIndex: chatData.forkPointIndex ?? undefined,
        pinned: chatData.pinned === 1 ? true : undefined,
        assistantId: chatData.assistantId || undefined,
      });
    }

    return chats;
  }

  async getCurrentChatId(): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_state WHERE key = ?',
      ['current_chat_id']
    );

    return row?.value || null;
  }

  async setCurrentChatId(chatId: string | null): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return this.enqueue(async () => {
      if (chatId === null) {
        await this.db!.runAsync('DELETE FROM app_state WHERE key = ?', ['current_chat_id']);
      } else {
        await this.db!.runAsync(
          'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)',
          ['current_chat_id', chatId]
        );
      }
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const chatDatabase = new ChatDatabase();
export default chatDatabase;
