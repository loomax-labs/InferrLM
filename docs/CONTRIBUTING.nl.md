[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-TW.md) | [日本語](CONTRIBUTING.ja.md) | [한국어](CONTRIBUTING.ko.md) | [Deutsch](CONTRIBUTING.de.md) | [Français](CONTRIBUTING.fr.md) | [Nederlands](CONTRIBUTING.nl.md)

# Meedoen aan InferrLM

Fijn dat je wilt meedoen aan InferrLM. Deze gids laat zien hoe je dat goed doet.

## Begin

### Een taak vinden

Bijdragen zijn welkom. Gemelde fouten en verzoeken om functies staan in [issues](https://github.com/sbhjt-gr/inferra/issues).

**Voordat je begint:**
1. Kijk in de issues naar iets dat je wilt doen
2. Zet een reactie bij die issue en begin

### Een nieuwe functie voorstellen

Wil je een eigen functie bouwen, open dan eerst een issue en beschrijf het idee duidelijk. Je voorstel legt uit:

- **Wat de functie is**: een duidelijke beschrijving van wat je wilt toevoegen
- **Waarom die nuttig is**: welk probleem die oplost, of wat die de gebruiker geeft
- **Hoe je het wilt bouwen**: je technische aanpak en de afhankelijkheden of wijzigingen die nodig zijn

Na het gesprek wordt de issue aan je toegewezen en kun je beginnen.

## Coderegels

### Kwaliteit en stijl

#### Geen emoji
Gebruik geen emoji in code, commentaar, commitberichten of tekst die gebruikers zien. Dat oogt slordig en kan coderingsproblemen geven. Schrijf duidelijke tekst.

```typescript
// Bad
console.log('Model loaded successfully! 🎉');

// Good
console.log('Model loaded successfully');

// Good
console.log('model_load_success');
```

#### Commentaar met een reden
Commentaar legt uit waarom de code zo is, niet wat die doet. De code zelf moet laten zien wat die doet.

```typescript
// Bad - stating the obvious
// Set the temperature to 0.7
const temperature = 0.7;

// Good - explaining the reasoning
// Use 0.7 temperature as a balance between creativity and coherence
// Lower values caused repetitive outputs in testing
const temperature = 0.7;
```

### Gewone praktijk bij React en React Native

#### useEffect alleen als het moet
Gebruik `useEffect` alleen als het echt nodig is. De meeste gevallen waarin je naar `useEffect` grijpt, los je met een beter patroon op.

**Wanneer je useEffect niet gebruikt:**
- Gegevens omvormen voor weergave (gebruik variabelen of `useMemo`)
- Acties van de gebruiker afhandelen (gebruik event handlers)
- Staat terugzetten als props veranderen (gebruik de `key`-prop, of reken tijdens het renderen)
- Staat bijwerken omdat props of staat veranderden (reken tijdens het renderen)

```typescript
// Bad - unnecessary useEffect
const [filteredModels, setFilteredModels] = useState([]);

useEffect(() => {
  setFilteredModels(models.filter(m => m.size < maxSize));
}, [models, maxSize]);

// Good - calculate during render
const filteredModels = models.filter(m => m.size < maxSize);
```

**Wanneer je useEffect wel gebruikt:**
- Afstemmen met een systeem buiten de component (API's, DOM, andere bibliotheken)
- Opruimen dat moet gebeuren als de component verdwijnt
- Abonnementen of event listeners opzetten

```typescript
// Good use of useEffect - external system synchronization
useEffect(() => {
  const subscription = modelDownloader.on('progress', handleProgress);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### Componenten indelen
Houd componenten gericht, en onder de 1000 regels als dat kan. Knip grote componenten in kleinere stukken die je opnieuw kunt gebruiken.

### TypeScript

### Bestandsnamen en plek

#### Namen
- Componenten: PascalCase (bijvoorbeeld `ChatMessage.tsx`)
- Hulpmiddelen: camelCase (bijvoorbeeld `formatMessage.ts`)
- Services: PascalCase (bijvoorbeeld `ModelDownloader.ts`)
- Types: PascalCase (bijvoorbeeld `types/chat.ts`)

#### Plek
Zet bestanden in de map die bij hun rol past:
- UI-componenten → `src/components/`
- Bedrijfslogica → `src/services/`
- Huldfuncties → `src/utils/`
- Type-definities → `src/types/`
- React-hooks → `src/hooks/`

### Zelf testen
Voordat je de PR instuurt:
1. Test op iOS en Android als de wijziging beide raakt
2. Test met verschillende modellen en instellingen
3. Kijk bij langlopende taken of geheugen weglekt
4. Controleer de interface op verschillende schermformaten

## Herkomst in de code

Als je code bijdraagt, vooral bij een grote functie of een lastig stuk, zet je een herkomstcommentaar. Dat helpt bij:
- erkenning voor wie bijdroeg
- context voor wie de code later onderhoudt
- een spoor van bijdragen uit de community

### Vorm

Zet het commentaar bovenaan nieuwe bestanden, of voor een groot blok:

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

Bij een kleine bijdrage of een wijziging in bestaande code:

```typescript
// Enhanced error handling for streaming responses
// Contributed by: @username (https://github.com/username)
function handleStreamError(error: Error) {
  // Implementation
}
```

### Wat erin hoort
- Je GitHub-naam met een link naar je profiel
- Het issuenummer, als dat er is
- Een korte beschrijving van wat de code doet (weglaten als de context het al zegt)

Dit staat naast de Git-geschiedenis en maakt bijdragen in de code zelf zichtbaar.

## Git-werkwijze

### Commitberichten
Schrijf duidelijke, korte commitberichten in deze vorm:

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

Soorten:
- `feat`: nieuwe functie
- `fix`: foutoplossing
- `docs`: wijziging in de documentatie
- `refactor`: herstructureren zonder ander gedrag
- `test`: tests toevoegen of wijzigen
- `chore`: onderhoud

Voorbeelden:
```
feat(rag): add document ingestion endpoint
fix(server): resolve buffer encoding in streaming
docs(api): add embeddings endpoint documentation
refactor(tcp): extract model operations to separate file
```

### Pull-requestproces

1. **Fork en kloon**: fork de repository en kloon die lokaal
2. **Branch**: maak een branch voor je functie of oplossing
3. **Wijzigingen**: bouw ze volgens deze gids
4. **Test**: test grondig
5. **Commit**: maak schone, logische commits met goede berichten
6. **Push**: push je branch naar je fork
7. **Pull request**: open een PR tegen de branch `main`

#### PR-beschrijving
Je pull request bevat:
- een duidelijke titel over de wijziging
- wat er veranderde en waarom
- een verwijzing naar gerelateerde issues, als die er zijn

## Licentie

Als je bijdraagt aan InferrLM, ga je ermee akkoord dat je bijdragen onder de AGPL-3.0-licentie vallen.

Bedankt dat je meedoet aan InferrLM.
