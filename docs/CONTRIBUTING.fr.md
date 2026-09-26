[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-TW.md) | [日本語](CONTRIBUTING.ja.md) | [한국어](CONTRIBUTING.ko.md) | [Deutsch](CONTRIBUTING.de.md) | [Français](CONTRIBUTING.fr.md) | [Nederlands](CONTRIBUTING.nl.md)

# Contribuer à InferrLM

Merci de vouloir contribuer à InferrLM. Ce guide explique comment le faire utilement.

## Pour commencer

### Trouver une tâche

Les contributions sont les bienvenues. Les bugs signalés et les demandes de fonctions sont dans l'onglet [issues](https://github.com/sbhjt-gr/inferra/issues).

**Avant de commencer :**
1. Parcours les issues pour trouver ce que tu veux faire
2. Commente l'issue pour dire que tu t'en occupes, puis commence

### Proposer une fonction

Si tu veux ajouter ta propre fonction, ouvre d'abord une issue et décris l'idée clairement. Ta proposition doit expliquer :

- **Ce que c'est** : une description claire de ce que tu veux ajouter
- **Pourquoi c'est utile** : le problème que ça règle, ou l'intérêt pour les utilisateurs
- **Comment tu comptes le faire** : ton approche technique, et les dépendances ou changements nécessaires

Après la discussion, l'issue te sera assignée et tu pourras commencer.

## Règles de code

### Qualité et style

#### Pas d'emoji
N'utilise pas d'emoji dans le code, les commentaires, les messages de commit, ni le texte visible par les utilisateurs. Ça fait peu sérieux et peut poser des problèmes d'encodage. Écris un texte clair.

```typescript
// Bad
console.log('Model loaded successfully! 🎉');

// Good
console.log('Model loaded successfully');

// Good
console.log('model_load_success');
```

#### Des commentaires utiles
Un commentaire doit expliquer pourquoi le code est écrit ainsi, pas ce qu'il fait. Le code lui-même doit montrer ce qu'il fait.

```typescript
// Bad - stating the obvious
// Set the temperature to 0.7
const temperature = 0.7;

// Good - explaining the reasoning
// Use 0.7 temperature as a balance between creativity and coherence
// Lower values caused repetitive outputs in testing
const temperature = 0.7;
```

### Usages React et React Native

#### Évite useEffect quand tu peux
N'utilise `useEffect` que si c'est vraiment nécessaire. La plupart des cas où on prend `useEffect` se règlent avec un meilleur modèle.

**Quand ne pas utiliser useEffect :**
- Transformer des données pour l'affichage (utilise des variables ou `useMemo`)
- Réagir à une action de l'utilisateur (utilise un gestionnaire d'événement)
- Remettre l'état à zéro quand les props changent (utilise la prop `key`, ou calcule au rendu)
- Mettre à jour l'état parce que des props ou l'état ont changé (calcule au rendu)

```typescript
// Bad - unnecessary useEffect
const [filteredModels, setFilteredModels] = useState([]);

useEffect(() => {
  setFilteredModels(models.filter(m => m.size < maxSize));
}, [models, maxSize]);

// Good - calculate during render
const filteredModels = models.filter(m => m.size < maxSize);
```

**Quand utiliser useEffect :**
- Se synchroniser avec un système externe (API, DOM, bibliothèque tierce)
- Un nettoyage qui doit se faire quand le composant disparaît
- Mettre en place un abonnement ou un écouteur

```typescript
// Good use of useEffect - external system synchronization
useEffect(() => {
  const subscription = modelDownloader.on('progress', handleProgress);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### Organisation des composants
Garde les composants ciblés, et sous 1000 lignes quand c'est possible. Découpe les gros composants en morceaux réutilisables.

### TypeScript

### Noms et emplacement des fichiers

#### Noms
- Composants : PascalCase (par exemple `ChatMessage.tsx`)
- Utilitaires : camelCase (par exemple `formatMessage.ts`)
- Services : PascalCase (par exemple `ModelDownloader.ts`)
- Types : PascalCase (par exemple `types/chat.ts`)

#### Emplacement
Place les fichiers selon leur rôle :
- Composants d'interface → `src/components/`
- Logique métier → `src/services/`
- Fonctions utilitaires → `src/utils/`
- Définitions de types → `src/types/`
- Hooks React → `src/hooks/`

### Essais à la main
Avant d'envoyer ta PR :
1. Teste sur iOS et Android si le changement touche les deux
2. Teste avec différents modèles et réglages
3. Cherche les fuites de mémoire dans les opérations longues
4. Vérifie l'interface sur plusieurs tailles d'écran

## Attribution du code

Quand tu contribues du code, surtout pour une fonction importante ou une partie complexe, ajoute un commentaire d'attribution. Ça aide à :
- reconnaître les contributeurs
- donner du contexte à ceux qui maintiendront le code
- garder une trace des contributions

### Format

Ajoute le commentaire en haut des nouveaux fichiers, ou avant un gros bloc :

```typescript
/**
 * Feature: RAG Document Ingestion
 * Contributed by: @username (https://github.com/username)
 * Issue: #123
 */

export class DocumentProcessor {
  // Implementation
}
```

Pour une petite contribution ou une modification de code existant :

```typescript
// Enhanced error handling for streaming responses
// Contributed by: @username (https://github.com/username)
function handleStreamError(error: Error) {
  // Implementation
}
```

### Quoi indiquer
- Ton nom GitHub avec un lien vers ton profil
- Le numéro d'issue, s'il y en a un
- Une courte description de ce que fait le code (facultatif si le contexte suffit)

Cette attribution s'ajoute à l'historique Git et permet de voir les contributions dans le code.

## Flux Git

### Messages de commit
Écris des messages clairs et courts, dans ce format :

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

Types :
- `feat` : nouvelle fonction
- `fix` : correction
- `docs` : changement de documentation
- `refactor` : remaniement sans changer le comportement
- `test` : ajout ou mise à jour de tests
- `chore` : entretien

Exemples :
```
feat(rag): add document ingestion endpoint
fix(server): resolve buffer encoding in streaming
docs(api): add embeddings endpoint documentation
refactor(tcp): extract model operations to separate file
```

### Processus de pull request

1. **Fork et clone** : fais un fork du dépôt et clone-le en local
2. **Branche** : crée une branche pour ta fonction ou ta correction
3. **Changements** : implémente-les en suivant ce guide
4. **Test** : teste sérieusement
5. **Commit** : fais des commits propres, logiques, avec de bons messages
6. **Push** : pousse ta branche vers ton fork
7. **Pull request** : ouvre une PR vers la branche `main`

#### Description de la PR
Ta pull request doit contenir :
- un titre clair sur le changement
- ce qui a changé et pourquoi
- un renvoi aux issues liées, s'il y en a

## Licence

En contribuant à InferrLM, tu acceptes que tes contributions soient sous la licence AGPL-3.0.

Merci de contribuer à InferrLM.
