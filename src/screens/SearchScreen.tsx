import { StyleSheet, Text, View, TextInput, FlatList } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';

export default function SearchScreen() {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme as 'light' | 'dark'];
  const isDark = currentTheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [results] = useState([
    { id: '1', title: 'Result 1' },
    { id: '2', title: 'Result 2' },
    { id: '3', title: 'Result 3' },
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.searchInput, {
          borderColor: colors.borderColor,
          color: colors.text,
        }]}
        placeholder="Search..."
        placeholderTextColor={colors.secondaryText}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.resultItem, { borderBottomColor: colors.borderColor }]}>
            <Text style={{ color: colors.text }}>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
  },
}); 
