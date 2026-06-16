import { supabase, ensureOwnProfile } from './supabase-client.js?v=20260529d';
import { resolveCardsIndexBackground, derivePaletteAndShapesFromLayers } from './components/autoBackground.js';

const root = document.getElementById('wizardApp');

const STEP_DEFS = [
  { id: 'name', label: 'Naam', short: 'Naam' },
  { id: 'themes', label: 'Thema\'s', short: 'Thema\'s' },
  { id: 'format', label: 'Formaat', short: 'Formaat' },
  { id: 'design', label: 'Ontwerp', short: 'Ontwerp' },
  { id: 'questions', label: 'Vragen', short: 'Vragen' },
  { id: 'cover', label: 'Cover & infosheet', short: 'Cover' },
  { id: 'publish', label: 'Publiceren', short: 'Publiceren' },
  { id: 'done', label: 'Klaar', short: 'Klaar' }
];

const DESIGN_SUBSTEPS = [
  { id: 'shapes', label: 'Vormen & iconen', short: 'Vormen' },
  { id: 'colors', label: 'Kleuren', short: 'Kleuren' },
  { id: 'background', label: 'Achtergrond', short: 'Achtergrond' },
  { id: 'type', label: 'Tekst', short: 'Tekst' }
];

const CUSTOM_PALETTE_ID = 'custom';
const EMPTY_SHAPE_PRESET_ID = 'none';
const DESIGN_SHAPE_PALETTE_ROLES = ['primary', 'secondary', 'accent', 'neutral', 'soft', 'secondary'];

const FORMAT_OPTIONS = [
  { id: 'landscape-85x55', label: 'Liggend', width: 85, height: 55, note: '85 x 55 mm' },
  { id: 'portrait-63x88', label: 'Staand', width: 63, height: 88, note: '63 x 88 mm' },
  { id: 'square-88x88', label: 'Vierkant', width: 88, height: 88, note: '88 x 88 mm' },
  { id: 'portrait-70x120', label: 'Tarot', width: 70, height: 120, note: '70 x 120 mm' }
];

const PALETTE_PRESETS = [
  {
    id: 'warm-sand',
    label: 'Warm zand',
    description: 'Zacht, open en vertrouwd.',
    baseCard: '#FCF7EA',
    basePanel: '#F4E4D4',
    softShape: '#E0D7C7',
    previewA: '#F7CDB9',
    previewB: '#D8DDD0',
    defaultAccent: '#2F5F63',
    defaultText: '#3C4650'
  },
  {
    id: 'cool-blue',
    label: 'Koel blauw',
    description: 'Helder en kalm.',
    baseCard: '#EEF1F8',
    basePanel: '#DEEAF5',
    softShape: '#D7E1EA',
    previewA: '#BFD5F0',
    previewB: '#DDE5EF',
    defaultAccent: '#4C7FB8',
    defaultIconAccent: '#2F5F63',
    defaultText: '#2C3E63'
  },
  {
    id: 'fresh-green',
    label: 'Fris groen',
    description: 'Luchtig en nieuw.',
    baseCard: '#EFF7F1',
    basePanel: '#E1EBDB',
    softShape: '#D5E4D0',
    previewA: '#CBE2B8',
    previewB: '#E4E9DB',
    defaultAccent: '#6F9E4E',
    defaultIconAccent: '#4F5FB2',
    defaultText: '#365C45'
  },
  {
    id: 'soft-purple',
    label: 'Zacht paars',
    description: 'Mild en dromerig.',
    baseCard: '#F4F1F8',
    basePanel: '#E8DFEE',
    softShape: '#E3DBE8',
    previewA: '#D8C7E2',
    previewB: '#E9E0EA',
    defaultAccent: '#6A63C2',
    defaultIconAccent: '#C87E96',
    defaultText: '#3C4650'
  },
  {
    id: 'earthy',
    label: 'Aards',
    description: 'Stevig en warm.',
    baseCard: '#FBEFE5',
    basePanel: '#E7D8C8',
    softShape: '#DBCEBE',
    previewA: '#C9A78C',
    previewB: '#D7CDBF',
    defaultAccent: '#BF6E43',
    defaultIconAccent: '#2C3E63',
    defaultText: '#3C4650'
  },
  {
    id: 'minimal',
    label: 'Minimalistisch',
    description: 'Licht en terughoudend.',
    baseCard: '#FFFFFF',
    basePanel: '#F0F0EC',
    softShape: '#E6E4DE',
    previewA: '#E5E1DA',
    previewB: '#F4F2EE',
    defaultAccent: '#7B8797',
    defaultIconAccent: '#6A63C2',
    defaultText: '#3C4650'
  },
  {
    id: 'playful',
    label: 'Speels',
    description: 'Losser en levendig.',
    baseCard: '#FFF1EA',
    basePanel: '#FFE7DB',
    softShape: '#F9E1D4',
    previewA: '#FFB599',
    previewB: '#D6EBE5',
    defaultAccent: '#D97F66',
    defaultIconAccent: '#2F5F63',
    defaultText: '#2F5F63'
  },
  {
    id: 'strong',
    label: 'Krachtig',
    description: 'Meer contrast en focus.',
    baseCard: '#F5F3F1',
    basePanel: '#EBD9CF',
    softShape: '#DCC8BF',
    previewA: '#B78D8D',
    previewB: '#D8DED7',
    defaultAccent: '#5B4456',
    defaultIconAccent: '#BF6E43',
    defaultText: '#2C3E63'
  },
  {
    id: 'teal-breeze',
    label: 'Teal bries',
    description: 'Fris en vertrouwd.',
    baseCard: '#EEF8F7',
    basePanel: '#D6ECEA',
    softShape: '#CFEDEA',
    previewA: '#BFE5E1',
    previewB: '#DCEAE7',
    defaultAccent: '#2F5F63',
    defaultIconAccent: '#C99A2E',
    defaultText: '#2F5F63'
  },
  {
    id: 'mist-blue',
    label: 'Mistblauw',
    description: 'Licht en stil.',
    baseCard: '#F5F8FA',
    basePanel: '#D9E3EA',
    softShape: '#CED9E5',
    previewA: '#DDE8F6',
    previewB: '#E6EDF3',
    defaultAccent: '#6F849D',
    defaultIconAccent: '#BF6E43',
    defaultText: '#32476B'
  },
  {
    id: 'honey-glow',
    label: 'Honing',
    description: 'Warm en uitnodigend.',
    baseCard: '#FBF3DE',
    basePanel: '#F4E8BE',
    softShape: '#E6C97A',
    previewA: '#F0D68E',
    previewB: '#EEDDB5',
    defaultAccent: '#B98C2E',
    defaultIconAccent: '#2F5F63',
    defaultText: '#5B4730'
  },
  {
    id: 'terracotta-soft',
    label: 'Terracotta',
    description: 'Aards en energiek.',
    baseCard: '#FCF0EA',
    basePanel: '#F1D6C8',
    softShape: '#E8C1AF',
    previewA: '#E5B39B',
    previewB: '#EADCD5',
    defaultAccent: '#BF6E43',
    defaultIconAccent: '#6A63C2',
    defaultText: '#5A4036'
  },
  {
    id: 'forest-soft',
    label: 'Bosgroen',
    description: 'Rustig en natuurlijk.',
    baseCard: '#EEF4EF',
    basePanel: '#D5DFC9',
    softShape: '#C8D9CC',
    previewA: '#BCD4C0',
    previewB: '#DCE6D8',
    defaultAccent: '#365C45',
    defaultIconAccent: '#6A63C2',
    defaultText: '#294338'
  },
  {
    id: 'blush-soft',
    label: 'Blush',
    description: 'Vriendelijk en zacht.',
    baseCard: '#FDF0F4',
    basePanel: '#F2CEDA',
    softShape: '#EFD4E0',
    previewA: '#F0C3D2',
    previewB: '#EEE3E8',
    defaultAccent: '#C87E96',
    defaultIconAccent: '#2F5F63',
    defaultText: '#5B4456'
  },
  {
    id: 'stone-calm',
    label: 'Steen',
    description: 'Neutraal en gebalanceerd.',
    baseCard: '#F5F3F1',
    basePanel: '#DFD9D2',
    softShape: '#D8DEE7',
    previewA: '#DED6CF',
    previewB: '#ECE9E5',
    defaultAccent: '#8F8177',
    defaultIconAccent: '#4F5FB2',
    defaultText: '#3C4650'
  },
  {
    id: 'night-ink',
    label: 'Nachtblauw',
    description: 'Dieper en gefocust.',
    baseCard: '#EFF2F8',
    basePanel: '#CAD2E5',
    softShape: '#C9D3E6',
    previewA: '#B8C7E4',
    previewB: '#DDE4F0',
    defaultAccent: '#2C3E63',
    defaultIconAccent: '#C99A2E',
    defaultText: '#24324F'
  }
];

const BRAND_FAMILIES = [
  { n: 'Sage', light: '#F7F4EF', base: '#CFE6DF', deep: '#6FAE9A' },
  { n: 'Mint', light: '#EFF7F1', base: '#CFE8D7', deep: '#67B38C' },
  { n: 'Olijf', light: '#EEF3E7', base: '#E3E9D5', deep: '#6F9E4E' },
  { n: 'Mos', light: '#EEF2E8', base: '#D5DFC9', deep: '#6E8E58' },
  { n: 'Blauw', light: '#F2F7F4', base: '#DDE8F6', deep: '#4C7FB8' },
  { n: 'Aqua', light: '#EEF8F7', base: '#CFEDEA', deep: '#56AFA7' },
  { n: 'Teal', light: '#ECF5F4', base: '#D6ECEA', deep: '#2F5F63' },
  { n: 'Inkt', light: '#EEF1F8', base: '#CAD2E5', deep: '#32476B' },
  { n: 'Violet', light: '#F4F1F8', base: '#E7E1F5', deep: '#6A63C2' },
  { n: 'Indigo', light: '#F1F2FA', base: '#D9DDF2', deep: '#4F5FB2' },
  { n: 'Roze', light: '#FAEEF2', base: '#F3DCE4', deep: '#C9657A' },
  { n: 'Berry', light: '#F9EEF4', base: '#EFD4E0', deep: '#B45B82' },
  { n: 'Crème', light: '#FCF7EA', base: '#F2E6C4', deep: '#D2AE58' },
  { n: 'Tarwe', light: '#F8F0D8', base: '#E9D39C', deep: '#C9A757' },
  { n: 'Zand', light: '#F8F4EA', base: '#E8DDC5', deep: '#C2A77A' },
  { n: 'Warm grijs', light: '#F6F2EE', base: '#DED6CF', deep: '#8F8177' },
  { n: 'Mosterd', light: '#F6ECC8', base: '#DFC16D', deep: '#B28727' },
  { n: 'Goud', light: '#FBF1D9', base: '#E8C97A', deep: '#C99A2E' },
  { n: 'Honing', light: '#FBF3DE', base: '#E6C97A', deep: '#B98C2E' },
  { n: 'Oker', light: '#F7ECD2', base: '#D9B85F', deep: '#A88733' },
  { n: 'Boter', light: '#FFF7D9', base: '#F3E39B', deep: '#D2BB58' },
  { n: 'Vanille', light: '#FFF8E8', base: '#F4E8BE', deep: '#D7BC72' },
  { n: 'Zacht citroen', light: '#FFF9D8', base: '#F0E58F', deep: '#C9B14C' },
  { n: 'Abrikoos', light: '#FBEFE5', base: '#F8E4D2', deep: '#C96A24' },
  { n: 'Terracotta', light: '#FCF0EA', base: '#F1D6C8', deep: '#BF6E43' },
  { n: 'Klei', light: '#FBEEE8', base: '#E8C1AF', deep: '#B96D4F' },
  { n: 'Tan', light: '#F8EFE8', base: '#F3E6D8', deep: '#8E5E3B' },
  { n: 'Perzik', light: '#FFF1EA', base: '#F6D3C2', deep: '#D89273' },
  { n: 'Blush', light: '#FDF0F4', base: '#F2CEDA', deep: '#C87E96' },
  { n: 'Zacht koraal', light: '#FDEEE8', base: '#F3C7B9', deep: '#D97F66' },
  { n: 'Slate', light: '#F3F4F8', base: '#EEEFF4', deep: '#7A7F99' },
  { n: 'Steen', light: '#F5F3F1', base: '#DFD9D2', deep: '#9A8F84' },
  { n: 'Rook', light: '#F2F4F7', base: '#D8DEE7', deep: '#75839A' },
  { n: 'Navy', light: '#EFF2F8', base: '#C9D3E6', deep: '#2C3E63' },
  { n: 'Koel grijs', light: '#F2F5F8', base: '#D4DCE5', deep: '#7B8797' },
  { n: 'Mist', light: '#F5F8FA', base: '#D9E3EA', deep: '#8194A3' },
  { n: 'Zilverblauw', light: '#F1F5F9', base: '#CED9E5', deep: '#6F849D' },
  { n: 'Houtskool', light: '#EFF1F3', base: '#C8CDD2', deep: '#3C4650' },
  { n: 'Pruim', light: '#F4EFF7', base: '#DCCFE5', deep: '#6F4F7E' },
  { n: 'Woud', light: '#EEF4EF', base: '#C8D9CC', deep: '#365C45' },
  { n: 'Aubergine', light: '#F5EFF4', base: '#D9CBD7', deep: '#5B4456' },
  { n: 'Zacht rood', light: '#FDEEEE', base: '#F2C7C7', deep: '#C96868' }
];

const BRAND_GROUP_BOUNDS = [0, 4, 8, 12, 16, 23, 30, 37, 42];

const BRAND_QUICK_SWATCHES = [
  { n: 'Wit', a: '#FFFFFF' },
  { n: 'Mintgroen', a: '#CFE6D8' },
  { n: 'Hemelblauw', a: '#CAD6EF' },
  { n: 'Lavendel', a: '#E7E1F5' },
  { n: 'Perzik', a: '#F8E4D2' },
  { n: 'Teal', a: '#A8D8D6' },
  { n: 'Botergeel', a: '#F4E2A5' },
  { n: 'Roze', a: '#F2C8D2' }
];

const TEXT_COLOR_QUICK_SWATCHES = [
  { n: 'Houtskool', a: '#3C4650' },
  { n: 'Navy', a: '#2C3E63' },
  { n: 'Teal', a: '#2F5F63' },
  { n: 'Woud', a: '#365C45' },
  { n: 'Violet', a: '#6A63C2' },
  { n: 'Berry', a: '#B45B82' },
  { n: 'Goud', a: '#C99A2E' },
  { n: 'Wit', a: '#FFFFFF' }
];

const TEXT_COLOR_FAMILIES = [
  { n: 'Houtskool', base: '#3C4650', deep: '#1A1A2E' },
  { n: 'Navy', base: '#2C3E63', deep: '#141E38' },
  { n: 'Indigo', base: '#4F5FB2', deep: '#363F80' },
  { n: 'Teal', base: '#2F5F63', deep: '#1A3E40' },
  { n: 'Sage', base: '#6FAE9A', deep: '#3D8070' },
  { n: 'Woud', base: '#365C45', deep: '#1E3D2A' },
  { n: 'Violet', base: '#6A63C2', deep: '#4A45A0' },
  { n: 'Berry', base: '#B45B82', deep: '#8C4365' },
  { n: 'Goud', base: '#C99A2E', deep: '#8C6A10' }
];

const STANDARD_ACCENT_ROWS = buildBrandToneRows(BRAND_FAMILIES, BRAND_GROUP_BOUNDS, BRAND_QUICK_SWATCHES, ['deep', 'base']);
const STANDARD_BACKGROUND_ROWS = buildBrandToneRows(BRAND_FAMILIES, BRAND_GROUP_BOUNDS, BRAND_QUICK_SWATCHES, ['light', 'base', 'deep']);
const STANDARD_TEXT_ROWS = [
  TEXT_COLOR_QUICK_SWATCHES,
  TEXT_COLOR_FAMILIES.map(function(family){ return { n: family.n, a: family.base }; }),
  TEXT_COLOR_FAMILIES.map(function(family){ return { n: family.n + ' diep', a: family.deep }; })
];

const BACKGROUND_PRESETS = [
  { id: 'clean', label: 'Clean' },
  { id: 'paper', label: 'Papier' },
  { id: 'subtle', label: 'Subtiel' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'soft-spots', label: 'Zachte vlekken' }
];

const SHAPE_PRESETS = [
  { id: 'circle', label: 'Cirkel' },
  { id: 'rounded', label: 'Afgerond' },
  { id: 'column', label: 'Kolom' },
  { id: 'side', label: 'Zijde' },
  { id: 'blob', label: 'Blob' },
  { id: 'band', label: 'Band' },
  { id: 'slope', label: 'Diagonaal' },
  { id: 'cornerwide', label: 'Hoekvlak' },
  { id: 'hill', label: 'Heuvel' },
  { id: 'star', label: 'Ster' },
  { id: 'diamond', label: 'Ruit' },
  { id: 'triangle', label: 'Driehoek' },
  { id: 'arrow', label: 'Pijl' },
  { id: 'cloud', label: 'Wolk' },
  { id: 'bar', label: 'Balk' },
  { id: 'pill', label: 'Pil' },
  { id: 'spark', label: 'Spark' },
  { id: 'wave', label: 'Golf' },
  { id: 'arch', label: 'Boog' },
  { id: 'leaf', label: 'Blad' },
  { id: 'corner', label: 'Hoek' },
  { id: 'crescent', label: 'Maan' },
  { id: 'burst', label: 'Burst' },
  { id: 'petal', label: 'Bloemblad' },
  { id: 'drop', label: 'Druppel' },
  { id: 'hexagon', label: 'Zeshoek' },
  { id: 'octagon', label: 'Achthoek' },
  { id: 'heart', label: 'Hart' },
  { id: 'shield', label: 'Schild' },
  { id: 'oval', label: 'Ovaal' },
  { id: 'parallelogram', label: 'Parallellogram' }
];

const ICON_PRESETS = [
  { id: 'none', label: 'Geen icoon', tags: 'none remove leeg geen', markup: '', fill: false },
  { id: 'sprout', label: 'Blad', tags: 'blad sprout leaf plant natuur', markup: '<path d="M50 76V38"/><path d="M50 52c-9 0-17-8-17-17 10 0 17 7 17 17Z"/><path d="M50 49c0-10 7-18 18-18 0 10-8 18-18 18Z"/><path d="M42 76h16"/>', fill: false },
  { id: 'spark', label: 'Vonk', tags: 'spark ster highlight glans focus', markup: '<path d="M50 18 56 36 74 42 56 48 50 66 44 48 26 42 44 36 50 18Z"/><path d="M24 22l4 4"/><path d="M72 62l4 4"/><path d="M76 22l-4 4"/><path d="M24 62l4-4"/>', fill: false },
  { id: 'circle', label: 'Cirkel', tags: 'circle focus target kern midden', markup: '<circle cx="50" cy="50" r="24"/><path d="M50 26v48"/><path d="M26 50h48"/>', fill: false },
  { id: 'heart', label: 'Hart', tags: 'hart heart liefde zorg warm', markup: '<path d="M50 74C31 61 18 49 18 35c0-10 7-17 17-17 7 0 12 4 15 9 3-5 8-9 15-9 10 0 17 7 17 17 0 14-13 26-32 39Z"/>', fill: false },
  { id: 'compass', label: 'Kompas', tags: 'kompas compass richting koers', markup: '<circle cx="50" cy="50" r="25"/><path d="M59 32 46 46 41 59 54 54 59 32Z"/><path d="M50 18v8"/><path d="M50 74v8"/><path d="M18 50h8"/><path d="M74 50h8"/>', fill: false },
  { id: 'wave', label: 'Golf', tags: 'wave golf flow beweging lijn', markup: '<path d="M16 53c8-10 16-15 24-15s14 5 22 5 14-5 22-5 16 5 24 15"/><path d="M16 65c8-10 16-15 24-15s14 5 22 5 14-5 22-5 16 5 24 15"/>', fill: false },
  { id: 'question', label: 'Vraagteken', tags: 'vraag question help why wat', markup: '<path d="M39 38c0-7 5-14 13-14s14 5 14 13c0 5-2 8-8 12-4 3-5 5-5 9"/><circle cx="52" cy="73" r="2.8"/>', fill: false },
  { id: 'connection', label: 'Verbinding', tags: 'verbinding connection network nodes', markup: '<circle cx="31" cy="38" r="8"/><circle cx="69" cy="38" r="8"/><circle cx="50" cy="66" r="8"/><path d="M38 43 45 57"/><path d="M62 43 55 57"/><path d="M39 38h22"/>', fill: false },
  { id: 'conversation', label: 'Gesprek', tags: 'gesprek conversation chat speech', markup: '<path d="M19 28h41a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10H41L28 76V64H19A10 10 0 0 1 9 54V38a10 10 0 0 1 10-10Z"/><path d="M61 38h18a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H67l-8 9v-9"/>', fill: false },
  { id: 'lightbulb', label: 'Idee', tags: 'idee lamp inzicht brainwave think', markup: '<path d="M40 73h20"/><path d="M43 83h14"/><path d="M50 16c13 0 24 10 24 23 0 8-4 13-9 18-3 3-5 7-5 12v2H40v-2c0-5-2-9-5-12-5-5-9-10-9-18 0-13 11-23 24-23Z"/>', fill: false },
  { id: 'eye', label: 'Observatie', tags: 'oog eye zien observeren kijken', markup: '<path d="M12 50c9-16 21-24 38-24s29 8 38 24c-9 16-21 24-38 24S21 66 12 50Z"/><circle cx="50" cy="50" r="10"/>', fill: false },
  { id: 'check', label: 'Akkoord', tags: 'check akkoord klaar done vink', markup: '<path d="M24 51 42 69 76 35"/>', fill: false },
  { id: 'key', label: 'Sleutel', tags: 'key sleutel inzicht oplossing', markup: '<circle cx="36" cy="50" r="16"/><path d="M52 50h28"/><path d="M68 50v10"/><path d="M76 50v6"/>', fill: false },
  { id: 'magnifier', label: 'Onderzoek', tags: 'zoeken search vergrootglas onderzoek', markup: '<circle cx="44" cy="44" r="20"/><path d="M58 58 76 76"/>', fill: false },
  { id: 'clock', label: 'Tijd', tags: 'tijd clock moment planning wacht', markup: '<circle cx="50" cy="50" r="26"/><path d="M50 34v18l10 7"/>', fill: false },
  { id: 'pencil', label: 'Notitie', tags: 'potlood pencil note schrijf', markup: '<path d="M61 20 80 39 39 80 20 84l4-19 41-45Z"/><path d="M54 27 73 46"/>', fill: false },
  { id: 'people', label: 'Groep', tags: 'groep people team samenwerking', markup: '<circle cx="34" cy="34" r="10"/><path d="M14 74c0-14 9-24 20-24s20 10 20 24"/><circle cx="66" cy="38" r="8"/><path d="M58 74c1-11 8-18 16-21"/>', fill: false },
  { id: 'plus', label: 'Plus', tags: 'plus add meer toevoegen', markup: '<path d="M50 24v52"/><path d="M24 50h52"/>', fill: false },
  { id: 'sun', label: 'Energie', tags: 'sun zon energie licht', markup: '<circle cx="50" cy="50" r="14"/><path d="M50 18v10M50 72v10M82 50H72M28 50H18M72 28l-7 7M35 65l-7 7M72 72l-7-7M35 35l-7-7"/>', fill: false },
  { id: 'star4', label: 'Highlight', tags: 'ster star highlight accent', markup: '<path d="M50 16 58 42 84 50 58 58 50 84 42 58 16 50 42 42 50 16Z"/>', fill: false },
  { id: 'book', label: 'Kennis', tags: 'book boek lezen kennis', markup: '<path d="M30 22h28c11 0 20 9 20 20v36H50c-11 0-20 9-20 20"/><path d="M30 22v76"/>', fill: false }
];

const TYPOGRAPHY_PRESETS = [
  {
    id: 'restful',
    label: 'Rustig',
    note: 'Vriendelijk en goed leesbaar.',
    titleFont: 'DM Serif Display',
    bodyFont: 'IBM Plex Sans',
    sample: 'Rust voor gesprek en aandacht.'
  },
  {
    id: 'modern',
    label: 'Modern',
    note: 'Strak en eigentijds.',
    titleFont: 'IBM Plex Sans',
    bodyFont: 'IBM Plex Sans',
    sample: 'Duidelijk, open en helder gezet.'
  },
  {
    id: 'editorial',
    label: 'Redactioneel',
    note: 'Meer contrast en verhaal.',
    titleFont: 'Fraunces',
    bodyFont: 'IBM Plex Sans',
    sample: 'Meer ritme en een redactioneel gevoel.'
  },
  {
    id: 'playful',
    label: 'Speels',
    note: 'Losser en wat lichter.',
    titleFont: 'Fraunces',
    bodyFont: 'IBM Plex Sans',
    sample: 'Iets speelser, zonder onrustig te worden.'
  },
  {
    id: 'workshop',
    label: 'Workshop',
    note: 'Open, groot en begeleidend.',
    titleFont: 'IBM Plex Sans',
    bodyFont: 'IBM Plex Sans',
    sample: 'Veel ruimte voor samen hardop denken.'
  }
];

const TYPOGRAPHY_FONT_OPTIONS = [
  'IBM Plex Sans',
  'DM Serif Display',
  'Fraunces',
  'Inter',
  'Plus Jakarta Sans',
  'Space Grotesk',
  'Merriweather',
  'Playfair Display'
];

const TYPOGRAPHY_TITLE_PT_OPTIONS = ['16', '18', '20', '22', '24', '28', '32'];
const TYPOGRAPHY_BODY_PT_OPTIONS = ['10', '11', '12', '14', '16', '18'];

const SAMPLE_QUESTIONS = [
  'Wanneer voel jij verbinding in ons team?',
  'Wat maakt samenwerken prettig?',
  'Wat blijft vaak onuitgesproken?',
  'Wat helpt om samen verder te komen?'
];

const DEFAULT_INFO_PAGE = {
  enabled: false,
  title: 'Over deze kaartenset',
  intro: 'Deze kaarten nodigen uit om samen te kijken naar wat er speelt, zichtbaar wordt en onbesproken blijft.',
  usage: 'Gebruik de kaarten als startpunt voor gesprek, reflectie of teamoverleg.'
};

const PREVIEW_ZOOM_MIN = 40;
const PREVIEW_ZOOM_MAX = 200;
const PREVIEW_ZOOM_STEP = 25;
const PREVIEW_DEFAULT_ZOOM = 100;
const PREVIEW_SHELL_WIDTH = 620;
const PREVIEW_SHELL_HEIGHT = 468;
const PREVIEW_SHELL_HEIGHT_EDITOR = 468;
const PREVIEW_BOTTOM_GUTTER = 70;
const DEFAULT_INDEX_BG_PALETTE = ['#67C5BB', '#7FD1C8', '#93DCD4', '#B1E8E1'];
const DESIGN_ICON_QUICK_IDS = ['lightbulb', 'eye', 'conversation', 'check', 'key', 'magnifier', 'clock', 'pencil'];
let previewRefreshRaf = 0;
let wizardPreviewBackModeController = null;
let wizardShapeDrag = null;
let wizardShapeDragEventsBound = false;
let wizardShapeLayerSeed = 1;
let wizardPreviewContextMenu = null;
let wizardPreviewContextState = null;
const SIDEBAR_COLLAPSE_KEY = 'uitgesproken:wizard:sidebar-collapsed';
const WIZARD_BOOT_TIMEOUT_MS = 12000;

const state = {
  booting: true,
  shellReady: false,
  user: null,
  username: '',
  space: null,
  existingSets: [],
  editingSet: null,
  stepIndex: 0,
  activeThemeId: 'theme-1',
  sidebarCollapsed: false,
  slugEditorOpen: false,
  slugCustom: false,
  saving: false,
  error: '',
  createdSet: null,
  iconSearchQuery: '',
  designSubstep: DESIGN_SUBSTEPS[0].id,
  typographyTarget: 'cards',
  previewTarget: 'cover',
  designPanelOpen: {
    shapes: true,
    colors: true,
    background: true
  },
  previewZoom: PREVIEW_DEFAULT_ZOOM,
  previewFlipped: false,
  previewGrid: false,
  previewNight: false,
  previewBackExtraDelayed: false,
  previewBackModeUiOverride: '',
  previewBackSurfaceUiOverride: '',
  designSelectionTouched: false,
  activeCoverTextIndex: 0,
  paletteExpanded: {},
  history: {
    past: [],
    future: [],
    lastSig: ''
  },
  wizardDraft: createDefaultDraft()
};

init().catch(function(err){
  console.error(err);
  state.booting = false;
  state.error = 'De wizard kon niet laden. Probeer het opnieuw.';
  renderApp();
});

async function init() {
  var bootTimeout = setTimeout(function(){
    if (!state.booting) return;
    state.booting = false;
    state.error = 'De wizard blijft laden. Ververs de pagina en probeer het opnieuw.';
    renderApp();
  }, WIZARD_BOOT_TIMEOUT_MS);
  document.body.classList.toggle('wizardEmbedded', isEmbeddedMode());
  state.sidebarCollapsed = readSidebarCollapsedPreference();
  window.addEventListener('resize', scheduleWizardPreviewRefresh);
  renderLoading();
  if (isEmbeddedMode() && initFromEmbeddedParentState()) {
    clearTimeout(bootTimeout);
    renderApp();
    return;
  }
  var sessionResp = await supabase.auth.getSession();
  var session = sessionResp && sessionResp.data ? sessionResp.data.session : null;
  var user = session && session.user ? session.user : null;
  if (!user) {
    location.href = '/login/?redirect=' + encodeURIComponent(location.pathname + location.search);
    return;
  }

  state.user = user;
  await ensureOwnProfile(user).catch(function(){});

  var profileResp = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();
  state.username = profileResp && profileResp.data && profileResp.data.username
    ? String(profileResp.data.username)
    : fallbackUsername(user);

  var requestedSpace = requestedSpaceSlug();
  var requestedSet = requestedSetRef();
  var spaceResp = null;
  if (requestedSpace) {
    spaceResp = await supabase
      .from('spaces')
      .select('id,slug,name')
      .eq('owner_id', user.id)
      .eq('slug', requestedSpace)
      .limit(1);
  }
  if (!spaceResp || !Array.isArray(spaceResp.data) || !spaceResp.data.length) {
    spaceResp = await supabase
      .from('spaces')
      .select('id,slug,name')
      .eq('owner_id', user.id)
      .limit(1);
  }
  state.space = spaceResp && Array.isArray(spaceResp.data) ? (spaceResp.data[0] || null) : null;

  if (state.space) {
    var setsResp = await supabase
      .from('sets')
      .select('id,slug,sort_order,title,card_format,is_public,status,visibility,bundle')
      .eq('space_id', state.space.id)
      .order('sort_order');
    var setRows = Array.isArray(setsResp.data) ? setsResp.data : [];
    state.existingSets = setRows.map(function(set){
      return {
        id: set.id,
        slug: set.slug,
        sort_order: set.sort_order
      };
    });
    if (requestedSet) {
      var sourceSet = setRows.find(function(set){
        return set && (String(set.id || '') === requestedSet || String(set.slug || '') === requestedSet);
      }) || null;
      if (sourceSet) applyExistingSet(sourceSet);
    }
    syncCanonicalWizardRoute();
  }

  resetWizardHistory();
  state.booting = false;
  clearTimeout(bootTimeout);
  renderApp();
}

function readEmbeddedParentState() {
  if (!isEmbeddedMode()) return null;
  try {
    if (!window.parent || window.parent === window) return null;
    var parentState = window.parent.UITGESPROKEN_DASHBOARD_STATE || window.parent.S;
    if (!parentState) return null;
    return {
      state: parentState,
      cache: window.parent.UITGESPROKEN_DASHBOARD_CACHE || window.parent.SC || {}
    };
  } catch (_err) {
    return null;
  }
}

function initFromEmbeddedParentState() {
  var parentCtx = readEmbeddedParentState();
  if (!parentCtx || !parentCtx.state) return false;
  var parentState = parentCtx.state;
  var parentSpace = parentState.space && typeof parentState.space === 'object'
    ? parentState.space
    : {};
  var spaceId = String(parentSpace.id || parentState.spaceId || '').trim();
  var spaceSlug = String(parentSpace.slug || parentState.spaceSlug || requestedSpaceSlug() || '').trim();
  if (!spaceId || !spaceSlug) return false;

  var parentSets = Array.isArray(parentState.sets) ? parentState.sets : [];
  state.user = {
    id: String(parentState._uid || '').trim(),
    email: String(parentState._email || '').trim()
  };
  state.username = String(parentState._username || parentState._userName || '').trim() || fallbackUsername(state.user);
  state.space = {
    id: spaceId,
    slug: spaceSlug,
    name: String(parentSpace.name || parentState.spaceName || '').trim()
  };
  state.existingSets = parentSets.map(function(set){
    return {
      id: set && set.id,
      slug: set && set.slug,
      sort_order: set && set.sort_order
    };
  }).filter(function(set){ return !!(set && set.id); });

  var requested = requestedSetRef();
  var sourceSet = parentSets.find(function(set){
    return set && (String(set.id || '') === requested || String(set.slug || '') === requested);
  }) || null;
  if (sourceSet) {
    var cachedBundle = sourceSet.id && parentCtx.cache ? parentCtx.cache[sourceSet.id] : null;
    var bundle = clonePlainData(sourceSet.bundle || cachedBundle || {});
    applyExistingSet({
      id: sourceSet.id,
      slug: sourceSet.slug,
      title: sourceSet.title,
      sort_order: sourceSet.sort_order,
      card_format: sourceSet.card_format || sourceSet.cardFormat || (bundle && bundle.meta && bundle.meta.cardFormat),
      is_public: sourceSet.is_public,
      status: sourceSet.status,
      visibility: sourceSet.visibility,
      bundle: bundle
    });
  }

  resetWizardHistory();
  state.booting = false;
  return true;
}

function createDefaultDraft() {
  var initialShapeLayer = defaultDesignShapeLayer({ type: '' });
  return {
    name: '',
    slug: '',
    format: 'landscape-85x55',
    palette: CUSTOM_PALETTE_ID,
    design: {
      shapePreset: '',
      iconPreset: '',
      accentIndex: 0,
      accentColor: '',
      backgroundPreset: 'subtle',
      shapeX: 12,
      shapeY: 14,
      shapeSize: 66,
      shapeRotate: -8,
      shapeLayers: [initialShapeLayer],
      activeShapeLayerId: initialShapeLayer.id
    },
    colors: {
      cardColor: '',
      cardTone: 0
    },
    typography: {
      preset: 'restful',
      titleSize: 'normaal',
      textSize: 'normaal',
      textColor: '',
      textAlign: 'center',
      textValign: 'center',
      textWeight: 'regular',
      textItalic: false,
      textUnderline: false,
      titleFont: 'DM Serif Display',
      bodyFont: 'IBM Plex Sans',
      titlePt: '21',
      bodyPt: '12'
    },
    coverTexts: null,
    themes: [
      { id: 'theme-1', name: 'Algemeen' }
    ],
    themeMode: 'single',
    questions: {
      'theme-1': ''
    },
    infoPage: Object.assign({}, DEFAULT_INFO_PAGE),
    preview: {
      cardsPageBg: '',
      setsBaseBg: '',
      setsHeaderBg: '',
      indexBackground: resolveCardsIndexBackground({}),
      doubleSided: true,
      backMode: 'mirror',
      backEditSurface: 'front',
      backScope: 'set',
      backStyleData: {
        scope: 'set',
        cssVars: {},
        byCard: {}
      },
      questionIds: {
        'theme-1': []
      },
      gridMode: false,
      nightMode: false
    },
    visibility: 'private'
  };
}

function defaultWizardCardsPageBg() {
  try {
    var styles = getComputedStyle(document.documentElement);
    var fromEditorPreview = String(styles.getPropertyValue('--pk-cards-index-bg') || '').trim();
    if (fromEditorPreview) return fromEditorPreview;
  } catch (_err) {}
  return '#FAFAF8';
}

function nextWizardShapeLayerId() {
  wizardShapeLayerSeed += 1;
  return 'shape-' + wizardShapeLayerSeed;
}

function rememberWizardShapeLayerId(id) {
  var match = String(id || '').match(/^shape-(\d+)$/);
  if (!match) return;
  var value = parseInt(match[1], 10);
  if (isFinite(value)) wizardShapeLayerSeed = Math.max(wizardShapeLayerSeed, value);
}

function defaultDesignShapePaletteRole(index) {
  return DESIGN_SHAPE_PALETTE_ROLES[index] || DESIGN_SHAPE_PALETTE_ROLES[index % DESIGN_SHAPE_PALETTE_ROLES.length] || 'primary';
}

function normalizeDesignShapePaletteRole(value, fallbackIndex) {
  var role = String(value || '').trim();
  if (DESIGN_SHAPE_PALETTE_ROLES.indexOf(role) >= 0 || role === 'neutral' || role === 'soft' || role === 'accent') return role;
  return defaultDesignShapePaletteRole(isFinite(fallbackIndex) ? fallbackIndex : 0);
}

function defaultDesignShapeLayer(overrides) {
  return Object.assign({
    id: nextWizardShapeLayerId(),
    type: EMPTY_SHAPE_PRESET_ID,
    x: 12,
    y: 14,
    size: 66,
    rotate: -8,
    colorMode: 'palette',
    paletteRole: 'primary',
    fill: '',
    fillOpacity: 0.92,
    fillTone: 0
  }, overrides || {});
}

function normalizeDesignShapeLayer(layer, fallbackIndex) {
  var source = layer && typeof layer === 'object' ? layer : {};
  var id = String(source.id || '').trim() || ('shape-' + (fallbackIndex + 1));
  rememberWizardShapeLayerId(id);
  var rawType = String(source.type || '').trim();
  var type = source.type === 'imported' && source.importMarkup ? 'imported' : (rawType ? normalizeShapePresetId(rawType) : '');
  var normalized = {
    id: id,
    type: type,
    x: clamp(Number(source.x), -25, 125),
    y: clamp(Number(source.y), -25, 125),
    size: clamp(Number(source.size), 12, 120),
    rotate: clamp(Number(source.rotate), -180, 180),
    colorMode: source.colorMode === 'custom' ? 'custom' : 'palette',
    paletteRole: normalizeDesignShapePaletteRole(source.paletteRole, fallbackIndex),
    fill: String(source.fill || '').trim(),
    fillOpacity: Math.max(0, Math.min(1, Number(source.fillOpacity) || 0.92)),
    fillTone: isFinite(Number(source.fillTone)) ? clamp(Number(source.fillTone), -100, 100) : 0
  };
  if (type === 'imported') {
    normalized.label = String(source.label || 'SVG').trim() || 'SVG';
    normalized.importMarkup = String(source.importMarkup || '').trim();
    normalized.importedHasFill = source.importedHasFill !== false;
    normalized.importedHasStroke = !!source.importedHasStroke;
    normalized.stroke = String(source.stroke || 'transparent').trim();
    normalized.strokeOpacity = Math.max(0, Math.min(1, Number(source.strokeOpacity) || 1));
    normalized.strokeWidth = Math.max(0, Number(source.strokeWidth) || 0);
  }
  return normalized;
}

function ensureDesignShapeLayers() {
  var design = state.wizardDraft && state.wizardDraft.design ? state.wizardDraft.design : (state.wizardDraft.design = {});
  var layers = Array.isArray(design.shapeLayers) ? design.shapeLayers.map(normalizeDesignShapeLayer) : [];
  if (!layers.length) {
    layers = [defaultDesignShapeLayer({
      type: normalizeShapePresetId(design.shapePreset),
      x: clamp(Number(design.shapeX), -25, 125),
      y: clamp(Number(design.shapeY), -25, 125),
      size: clamp(Number(design.shapeSize), 12, 120),
      rotate: clamp(Number(design.shapeRotate), -180, 180)
    })];
  }
  design.shapeLayers = layers;
  var activeId = String(design.activeShapeLayerId || '').trim();
  if (!activeId || !layers.some(function(layer){ return layer.id === activeId; })) {
    design.activeShapeLayerId = layers[0].id;
  }
  syncLegacyShapeFields();
  return design.shapeLayers;
}

function wizardDesignSelectionActive() {
  return !!state.designSelectionTouched;
}

function getActiveDesignShapeLayer() {
  var layers = ensureDesignShapeLayers();
  var activeId = String(state.wizardDraft.design.activeShapeLayerId || '').trim();
  return layers.find(function(layer){ return layer.id === activeId; }) || layers[0] || null;
}

function setActiveDesignShapeLayer(layerId) {
  var layers = ensureDesignShapeLayers();
  var match = layers.find(function(layer){ return layer.id === layerId; }) || layers[0] || null;
  if (!match) return null;
  state.wizardDraft.design.activeShapeLayerId = match.id;
  state.designSelectionTouched = true;
  syncLegacyShapeFields();
  return match;
}

function ensureWizardCoverTexts() {
  if (state.wizardDraft.coverTexts === null || state.wizardDraft.coverTexts === undefined) {
    state.wizardDraft.coverTexts = clonePlainData(buildCoverTexts(getTypographyPreset(), getSelectedPalette(), getAccentColor())) || [];
  }
  if (!Array.isArray(state.wizardDraft.coverTexts)) state.wizardDraft.coverTexts = [];
  if (!state.wizardDraft.coverTexts.length) state.activeCoverTextIndex = -1;
  else state.activeCoverTextIndex = Math.max(0, Math.min(state.wizardDraft.coverTexts.length - 1, Number(state.activeCoverTextIndex) || 0));
  return state.wizardDraft.coverTexts;
}

function defaultCoverTexts() {
  var titleColor = effectiveTextColor();
  var titleText = state.wizardDraft.name.trim() || 'Jouw kaartenset';
  var cardBase = effectiveCardColor();
  var bodyFont = effectiveBodyFont();
  return [
    {
      text: titleText,
      x: 50,
      y: 43,
      size: coverTitleSizeValue(),
      align: 'center',
      valign: 'center',
      font: effectiveTitleFont(),
      color: titleColor
    },
    {
      text: countAllQuestions() > 0 ? 'gesprekskaarten' : 'eerste opzet',
      x: 50,
      y: 56,
      size: Math.max(10, Math.min(16, effectiveBodyPt())),
      align: 'center',
      valign: 'center',
      font: bodyFont,
      color: mixHex(titleColor, cardBase, 0.34)
    }
  ];
}

function ensureWizardCoverTextItem(index) {
  index = Math.max(0, Number(index) || 0);
  var list = ensureWizardCoverTexts();
  var defaults = defaultCoverTexts();
  while (list.length <= index) {
    list.push(clonePlainData(defaults[list.length]) || {
      text: '',
      x: 50,
      y: 50,
      size: Math.max(10, Math.min(16, effectiveBodyPt())),
      align: 'center',
      valign: 'center',
      font: effectiveBodyFont(),
      color: effectiveTextColor()
    });
  }
  return list[index];
}

function getActiveWizardCoverTextIndex() {
  var list = ensureWizardCoverTexts();
  if (!list.length) return -1;
  return Math.max(0, Math.min(list.length - 1, Number(state.activeCoverTextIndex) || 0));
}

function setActiveWizardCoverTextIndex(idx) {
  var list = ensureWizardCoverTexts();
  if (!list.length) {
    state.activeCoverTextIndex = -1;
    return -1;
  }
  state.activeCoverTextIndex = Math.max(0, Math.min(list.length - 1, Number(idx) || 0));
  return state.activeCoverTextIndex;
}

function syncLegacyShapeFields() {
  var design = state.wizardDraft && state.wizardDraft.design ? state.wizardDraft.design : null;
  if (!design) return;
  var active = Array.isArray(design.shapeLayers)
    ? design.shapeLayers.find(function(layer){ return layer.id === design.activeShapeLayerId; }) || design.shapeLayers[0]
    : null;
  if (!active) return;
  if (active.type !== 'imported') design.shapePreset = String(active.type || '').trim() ? normalizeShapePresetId(active.type) : '';
  design.shapeX = active.x;
  design.shapeY = active.y;
  design.shapeSize = active.size;
  design.shapeRotate = active.rotate;
}

function buildBrandToneRows(families, bounds, quickRow, tones) {
  var rows = [quickRow.slice()];
  for (var b = 0; b < bounds.length - 1; b += 1) {
    var group = families.slice(bounds[b], bounds[b + 1]);
    tones.forEach(function(tone){
      rows.push(group.map(function(family){
        return {
          n: family.n + (tone === 'base' ? '' : ' ' + tone),
          a: family[tone]
        };
      }));
    });
  }
  return rows;
}

function clonePlainData(value) {
  if (value == null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return null;
  }
}

function readCssVarString(store, key) {
  if (!store || typeof store !== 'object') return '';
  return String(store[key] || '').trim();
}

function fallbackUsername(user) {
  var email = user && user.email ? String(user.email) : '';
  var local = email.split('@')[0] || '';
  return slugify(local || 'jij');
}

function requestedSpaceSlug() {
  try {
    if (window.WIZARD_EMBEDDED_PARAMS && window.WIZARD_EMBEDDED_PARAMS.space) {
      return String(window.WIZARD_EMBEDDED_PARAMS.space || '').trim();
    }
    var parts = String(location.pathname || '').replace(/^\/|\/$/g, '').split('/').filter(Boolean);
    if (parts.length >= 3 && parts[1] === 'dashboard' && parts[2] === 'wizard') {
      return String(parts[0] || '').trim();
    }
    return String(new URLSearchParams(location.search || '').get('space') || '').trim();
  } catch (_err) {
    return '';
  }
}

function requestedSetRef() {
  try {
    if (window.WIZARD_EMBEDDED_PARAMS && window.WIZARD_EMBEDDED_PARAMS.set) {
      return String(window.WIZARD_EMBEDDED_PARAMS.set || '').trim();
    }
    var queryRef = String(new URLSearchParams(location.search || '').get('set') || '').trim();
    if (queryRef) return queryRef;
    var spaceSlug = requestedSpaceSlug() || 'default';
    var storedRef = String(sessionStorage.getItem('pk_dashboard_wizard_set_' + spaceSlug) || '').trim();
    return storedRef === '__new__' ? '' : storedRef;
  } catch (_err) {
    return '';
  }
}

function isEmbeddedMode() {
  try {
    if (window.WIZARD_EMBEDDED_PARAMS && window.WIZARD_EMBEDDED_PARAMS.embedded) return true;
    return (new URLSearchParams(location.search || '').get('embedded') || '') === '1';
  } catch (_err) {
    return false;
  }
}

function embeddedParentOrigin() {
  if (!isEmbeddedMode()) return window.location.origin || '*';
  try {
    if (window.WIZARD_EMBEDDED_PARAMS && window.WIZARD_EMBEDDED_PARAMS.parentOrigin) {
      return String(window.WIZARD_EMBEDDED_PARAMS.parentOrigin || '').trim() || '*';
    }
  } catch (_err) {}
  try {
    if (document.referrer) return new URL(document.referrer, window.location.href).origin;
  } catch (_err) {}
  try {
    if (window.location.origin && window.location.origin !== 'null') return window.location.origin;
  } catch (_err) {}
  return '*';
}

function embeddedLinkAttrs() {
  return isEmbeddedMode() ? ' target="_top"' : '';
}

function publicSiteOrigin() {
  return 'https://uitgesproken.me';
}

function readSidebarCollapsedPreference() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
  } catch (_err) {
    return false;
  }
}

function writeSidebarCollapsedPreference(value) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, value ? '1' : '0');
  } catch (_err) {}
}

function embeddedPreviewHref() {
  var username = state.username ? String(state.username).trim() : '';
  var slug = '';
  if (state.createdSet && state.createdSet.slug) {
    slug = String(state.createdSet.slug).trim();
  } else if (state.editingSet && state.editingSet.slug) {
    slug = String(state.editingSet.slug).trim();
  }
  if (!username || !slug) return '';
  return '/@' + encodeURIComponent(username) + '/' + encodeURIComponent(slug) + '/';
}

function useEmbeddedParentPreview() {
  var stepId = currentStepId();
  return isEmbeddedMode() && (stepId === 'name' || stepId === 'themes' || stepId === 'format');
}

function buildEmbeddedPreviewSyncPayload() {
  var preview = buildPreviewState();
  var metrics = previewWindowMetrics();
  return {
    external: useEmbeddedParentPreview(),
    stepId: currentStepId(),
    bundle: cloneJsonSafe(preview.bundle || null),
    previewKey: preview.previewKey || 'cover',
    previewFile: preview.previewFile || 'voorkant.svg',
    frontTxt: preview.frontTxt || '',
    backTxt: preview.backTxt || '',
    backDesignKey: preview.backDesignKey || '',
    html: preview && preview.html ? preview.html : '',
    navLabel: preview && preview.navLabel ? preview.navLabel : 'Cover',
    zoomPct: state.previewZoom || PREVIEW_DEFAULT_ZOOM,
    doubleSided: previewDoubleSided(),
    flipped: previewDoubleSided() && !!state.previewFlipped,
    gridMode: previewGridEnabled(),
    nightMode: previewNightEnabled(),
    backMode: previewBackModeForUi(),
    backModeActual: previewBackMode(),
    backEditSurface: previewBackEditSurface(),
    backEditSurfaceUi: previewBackEditSurfaceForUi(),
    backScope: previewBackScope(),
    backExtraDelayed: !!state.previewBackExtraDelayed,
    canCardBackScope: previewCanUseCardBackScope(),
    stageStyle: metrics.stageStyle,
    shellStyle: metrics.shellStyle
  };
}

function syncEmbeddedPreview() {
  if (!isEmbeddedMode() || !window.parent || window.parent === window) return;
  try {
    window.parent.postMessage({
      uitgesproken: 1,
      type: 'wizardPreviewSync',
      payload: buildEmbeddedPreviewSyncPayload()
    }, embeddedParentOrigin());
  } catch (_err) {}
}

function syncEmbeddedHeader() {
  if (!isEmbeddedMode() || !window.parent || window.parent === window) return;
  var step = STEP_DEFS[state.stepIndex] || STEP_DEFS[0];
  var substep = getDesignSubstep();
  var title = String(state.wizardDraft.name || '').trim() || (state.editingSet ? 'Naamloze set' : 'Nieuwe kaartenset');
  var subtitle = state.stepIndex === STEP_DEFS.length - 1
    ? (state.editingSet ? 'Kaartenset bijgewerkt.' : 'Kaartenset aangemaakt.')
    : ('Stap ' + (state.stepIndex + 1) + ' van ' + STEP_DEFS.length);
  try {
    window.parent.postMessage({
      uitgesproken: 1,
      type: 'wizardHeaderSync',
      payload: {
        title: title,
        stepLabel: step.id === 'design' ? (step.label + ' · ' + substep.short) : step.label,
        subtitle: subtitle,
        previewUrl: embeddedPreviewHref(),
        setId: state.createdSet && state.createdSet.id ? state.createdSet.id : (state.editingSet && state.editingSet.id ? state.editingSet.id : ''),
        canUndo: canWizardUndo(),
        canRedo: canWizardRedo(),
        canDelete: !!(state.editingSet && state.editingSet.id)
      }
    }, embeddedParentOrigin());
  } catch (_err) {}
}

function cloneJsonSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function currentStepId() {
  return (STEP_DEFS[state.stepIndex] && STEP_DEFS[state.stepIndex].id) || STEP_DEFS[0].id;
}

function normalizeDesignSubstepId(value) {
  var current = String(value || '').trim();
  return DESIGN_SUBSTEPS.some(function(step){ return step.id === current; })
    ? current
    : DESIGN_SUBSTEPS[0].id;
}

function getDesignSubstep() {
  var id = normalizeDesignSubstepId(state.designSubstep);
  return DESIGN_SUBSTEPS.find(function(step){
    return step.id === id;
  }) || DESIGN_SUBSTEPS[0];
}

function getDesignSubstepIndex() {
  return DESIGN_SUBSTEPS.findIndex(function(step){
    return step.id === normalizeDesignSubstepId(state.designSubstep);
  });
}

function isDesignStep() {
  return currentStepId() === 'design';
}

function wizardPreviewEditingActive() {
  return true;
}

function wizardShapeEditingEnabled() {
  return wizardPreviewEditingActive() && getDesignSubstep().id === 'shapes';
}

function setDesignSubstep(id) {
  state.designSubstep = normalizeDesignSubstepId(id);
  if (state.designSubstep === 'type') {
    state.typographyTarget = normalizePreviewTarget(state.previewTarget) === 'cover' ? 'cover' : 'cards';
  }
}

function normalizeTypographyTarget(value) {
  return String(value || '').trim() === 'cards' ? 'cards' : 'cover';
}

function setTypographyTarget(value) {
  state.typographyTarget = normalizeTypographyTarget(value);
  state.previewTarget = state.typographyTarget === 'cards' ? 'theme' : 'cover';
}

function currentWizardHistorySnapshot() {
  return {
    wizardDraft: cloneJsonSafe(state.wizardDraft),
    activeThemeId: state.activeThemeId,
    stepIndex: state.stepIndex,
    designSubstep: state.designSubstep,
    typographyTarget: state.typographyTarget,
    previewTarget: state.previewTarget,
    slugEditorOpen: !!state.slugEditorOpen,
    slugCustom: !!state.slugCustom
  };
}

function wizardHistorySig(snapshot) {
  return JSON.stringify(snapshot || currentWizardHistorySnapshot());
}

function resetWizardHistory() {
  var snap = currentWizardHistorySnapshot();
  state.history = {
    past: [snap],
    future: [],
    lastSig: wizardHistorySig(snap)
  };
}

function pushWizardHistory(force) {
  var snap = currentWizardHistorySnapshot();
  var sig = wizardHistorySig(snap);
  if (!force && sig === state.history.lastSig) return;
  state.history.past.push(snap);
  if (state.history.past.length > 90) state.history.past.shift();
  state.history.future = [];
  state.history.lastSig = sig;
}

function restoreWizardHistorySnapshot(snapshot) {
  if (!snapshot || !snapshot.wizardDraft) return;
  state.wizardDraft = cloneJsonSafe(snapshot.wizardDraft);
  setStepIndex(parseInt(snapshot.stepIndex, 10) || 0);
  state.designSubstep = normalizeDesignSubstepId(snapshot.designSubstep);
  state.typographyTarget = normalizeTypographyTarget(snapshot.typographyTarget);
  state.previewTarget = normalizePreviewTarget(snapshot.previewTarget || (state.typographyTarget === 'cards' ? 'theme' : 'cover'));
  state.slugEditorOpen = !!snapshot.slugEditorOpen;
  state.slugCustom = !!snapshot.slugCustom;
  state.activeThemeId = String(snapshot.activeThemeId || '').trim() || ((state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1');
  state.previewGrid = !!(state.wizardDraft.preview && state.wizardDraft.preview.gridMode);
  state.previewNight = !!(state.wizardDraft.preview && state.wizardDraft.preview.nightMode);
  state.previewBackExtraDelayed = false;
  state.previewBackModeUiOverride = '';
  state.previewBackSurfaceUiOverride = '';
  if (!state.wizardDraft.themes.some(function(theme){ return theme.id === state.activeThemeId; })) {
    state.activeThemeId = (state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1';
  }
  syncContextForStep(currentStepId());
}

function canWizardUndo() {
  return !state.saving && !!(state.history && state.history.past && state.history.past.length > 1);
}

function canWizardRedo() {
  return !state.saving && !!(state.history && state.history.future && state.history.future.length);
}

function undoWizardHistory() {
  if (!canWizardUndo()) return;
  var current = currentWizardHistorySnapshot();
  var previous = state.history.past[state.history.past.length - 2];
  state.history.future.unshift(current);
  state.history.past.pop();
  restoreWizardHistorySnapshot(previous);
  state.history.lastSig = wizardHistorySig(previous);
  renderApp();
}

function redoWizardHistory() {
  if (!canWizardRedo()) return;
  var next = state.history.future.shift();
  state.history.past.push(cloneJsonSafe(next));
  restoreWizardHistorySnapshot(next);
  state.history.lastSig = wizardHistorySig(next);
  renderApp();
}

function commitWizardChange(preserveFocus) {
  pushWizardHistory();
  renderApp(!!preserveFocus);
}

window.addEventListener('message', function(e){
  if (!e.data || e.data.uitgesproken !== 1) return;
  if (e.data.type === 'wizardAction') {
    var action = String(e.data.action || '').trim();
    if (action === 'undo') {
      undoWizardHistory();
      return;
    }
    if (action === 'redo') {
      redoWizardHistory();
    }
    return;
  }
  if (e.data.type !== 'wizardPreviewCommand') return;
  var previewAction = String(e.data.action || '').trim();
  var previewValue = e.data.value;
  if (previewAction === 'navigate') {
    navigateWizardPreview(Number(previewValue) || 0);
    return;
  }
  if (previewAction === 'navigateHome') {
    navigateWizardPreviewHome();
    return;
  }
  if (previewAction === 'toggleFlip') {
    toggleWizardPreviewFlip();
    return;
  }
  if (previewAction === 'toggleGrid') {
    toggleWizardPreviewGrid();
    return;
  }
  if (previewAction === 'toggleNight') {
    toggleWizardPreviewNight();
    return;
  }
  if (previewAction === 'setBackMode') {
    setWizardPreviewBackMode(previewValue);
    return;
  }
  if (previewAction === 'setBackEditSurface') {
    setWizardPreviewBackEditSurface(previewValue);
    return;
  }
  if (previewAction === 'setBackScope') {
    setWizardPreviewBackScope(previewValue);
    return;
  }
  if (previewAction === 'zoomStep') {
    stepWizardPreviewZoom(Number(previewValue) || 0);
    return;
  }
  if (previewAction === 'zoomReset') {
    setWizardPreviewZoom(PREVIEW_DEFAULT_ZOOM);
  }
});

function dashboardHomeHref() {
  return '/dashboard/';
}

function dashboardWizardHref(setRef) {
  var ref = String(setRef || '').trim();
  var base = dashboardHomeHref() + 'wizard/';
  try {
    var slug = state.space && state.space.slug ? String(state.space.slug) : requestedSpaceSlug();
    var key = 'pk_dashboard_wizard_set_' + (slug || 'default');
    if (ref) sessionStorage.setItem(key, ref);
    else sessionStorage.removeItem(key);
  } catch (_err) {}
  return base;
}

function syncCanonicalWizardRoute() {
  if (isEmbeddedMode()) return;
  try {
    var desired = dashboardWizardHref(state.editingSet && state.editingSet.id ? state.editingSet.id : requestedSetRef());
    var current = String(location.pathname || '') + String(location.search || '');
    if (desired !== current) history.replaceState({ wizard: true }, '', desired);
  } catch (_err) {}
}

function renderLoading() {
  if (isEmbeddedMode()) {
    root.innerHTML = '';
    return;
  }
  root.innerHTML =
    '<div class="appBoot wizardBoot" role="status" aria-live="polite">' +
      '<div class="appBootInner">' +
        '<div class="appBootLogo">' +
          '<img src="/assets/logo-icons/masters/master-squircle.svg" alt="Uitgesproken">' +
        '</div>' +
        '<div class="appBootWordmark">Uitgesproken</div>' +
        '<div class="appBootSub">Ruimte aan het verkennen</div>' +
        '<div class="appBootBar" aria-hidden="true">' +
          '<div class="appBootBarFill"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function renderApp(preserveFocus) {
  var focusState = preserveFocus ? captureFocusState() : null;
  closeWizardPreviewContextMenu();
  if (state.booting) {
    renderLoading();
    return;
  }
  if (!state.space) {
    root.innerHTML = renderNoSpaceState();
    return;
  }
  state.shellReady = true;
  syncWizardPreviewActionApi();
  root.innerHTML = renderWizardShell();
  wireEvents();
  requestAnimationFrame(function(){
    applyWizardPreviewUiState();
    if (useEmbeddedParentPreview()) {
      revealPreparedWizardPreview();
    } else {
      renderPreviewBackground(revealPreparedWizardPreview);
    }
    syncEmbeddedPreview();
  });
  syncEmbeddedHeader();
  if (focusState) restoreFocusState(focusState);
}

function revealPreparedWizardPreview() {
  var previewPanel = root.querySelector('.wizardPreviewPanel');
  if (previewPanel) previewPanel.classList.remove('is-preparing');
  var previewShell = root.querySelector('.stijlCanvasWindow[data-wizard-preview="1"]');
  if (previewShell) previewShell.classList.remove('is-preparing');
}

function renderNoSpaceState() {
  return (
    '<div class="wizardEmpty">' +
      '<h1>Eerst een ruimte aanmaken</h1>' +
      '<p>De wizard maakt een echte kaartenset aan in je bestaande omgeving. Daarvoor hebben we eerst een ruimte nodig om de set in op te slaan.</p>' +
      '<div class="wizardSummaryActions" style="justify-content:center">' +
        '<a class="wizardPrimaryBtn" href="' + esc(dashboardHomeHref()) + '"' + embeddedLinkAttrs() + '>Open dashboard</a>' +
      '</div>' +
    '</div>'
  );
}

function renderWizardShell() {
  var stepId = currentStepId();
  var useExternalPreview = useEmbeddedParentPreview();
  return (
    '<div class="wizardShell wizardShellUnified wizardShellStep-' + stepId + '">' +
      renderTopbar() +
      '<section class="wizardFrame wizardFrameStep-' + stepId + '">' +
        renderFrameHeader() +
        '<div class="wizardWorkbench is-step-' + stepId + (useExternalPreview ? ' is-external-preview' : '') + '">' +
          '<main class="wizardMainPanel">' +
            renderMainPanel() +
          '</main>' +
          (useExternalPreview ? '' : renderPreviewPanel()) +
        '</div>' +
        (isEmbeddedMode() || state.stepIndex === STEP_DEFS.length - 1 ? '' : renderFooter()) +
      '</section>' +
    '</div>'
  );
}

function renderTopbar() {
  var activeStep = state.stepIndex + 1;
  return (
    '<div class="wizardTopbar">' +
      '<a class="wizardBrand" href="' + esc(dashboardHomeHref()) + '"' + embeddedLinkAttrs() + '>' +
        '<span class="wizardBrandMark" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3Z"></path>' +
          '</svg>' +
        '</span>' +
        '<span class="wizardBrandTitle"><strong>Uitgesproken</strong><span>Nieuwe kaartenset wizard</span></span>' +
      '</a>' +
      '<div class="wizardProgressMeta">' +
        '<div class="wizardDots">' +
          STEP_DEFS.map(function(step, index){
            var cls = 'wizardDot';
            if (index < state.stepIndex) cls += ' is-done';
            if (index === state.stepIndex) cls += ' is-active';
            return '<span class="' + cls + '" aria-hidden="true"></span>';
          }).join('') +
        '</div>' +
        '<div class="wizardStepMeta">Stap ' + activeStep + ' van ' + STEP_DEFS.length + '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderFrameHeader() {
  var step = STEP_DEFS[state.stepIndex] || STEP_DEFS[0];
  var heading = step.label;
  var headerClass = 'wizardFrameHeader';
  var showDesignToolbar = false;
  if (step.id === 'design') heading = step.label + ' · ' + getDesignSubstep().label;
  return (
    '<div class="' + headerClass + (showDesignToolbar ? ' is-design-toolbar' : '') + '">' +
      '<div class="wizardFrameCluster wizardFrameCluster--menu">' +
        '<div class="wizardFrameTitleGroup">' +
          renderFrameStepMenu(heading) +
        '</div>' +
      '</div>' +
      renderFrameCenterToolbar(step.id) +
      '<div class="wizardFrameCluster wizardFrameCluster--nav">' +
        '<div class="wizardFrameAside">' +
          '<div class="wizardFrameMeta">Stap ' + (state.stepIndex + 1) + ' van ' + STEP_DEFS.length + '</div>' +
          (state.stepIndex === STEP_DEFS.length - 1 ? '' : renderNavButtons('wizardHeaderNavActions')) +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderFrameCenterToolbar(stepId) {
  var showRail = shouldShowPreviewTargetRail(stepId);
  if (!showRail) return '';
  var targetRail = renderPreviewTargetRail();
  return (
    '<div class="wizardFrameCenterRow">' +
      '<div class="wizardFrameCluster wizardFrameCluster--previewRail">' +
        targetRail +
      '</div>' +
    '</div>'
  );
}

function shouldShowPreviewTargetRail(stepId) {
  stepId = stepId || currentStepId();
  var themeCount = Array.isArray(state.wizardDraft.themes) ? state.wizardDraft.themes.length : 0;
  if (stepId === 'themes') return themeCount > 1;
  return stepId === 'design' || stepId === 'questions' || stepId === 'cover';
}

function stepAllowsCoverPreview(stepId) {
  stepId = stepId || currentStepId();
  return stepId === 'name' || stepId === 'themes' || stepId === 'format' || stepId === 'design' || stepId === 'cover';
}

function renderPreviewTargetRail() {
  var stepId = currentStepId();
  var allowCover = stepAllowsCoverPreview(stepId);
  var target = normalizePreviewTarget(state.previewTarget);
  var themes = Array.isArray(state.wizardDraft.themes) ? state.wizardDraft.themes : [];
  return (
    '<div class="wizardPreviewTargetRail stijlSlideRail wizardCompactSlideRail" role="tablist" aria-label="Preview kaart kiezen">' +
      (allowCover ? renderPreviewTargetCard('cover', '', 'Cover', target === 'cover') : '') +
      themes.map(function(theme, index){
        var selected = target === 'theme' && theme.id === state.activeThemeId;
        var label = theme.name || ('Thema ' + (index + 1));
        return renderPreviewTargetCard('theme', theme.id, label, selected);
      }).join('') +
      (stepId === 'themes'
        ? (
          '<button class="stijlSlideCard wizardPreviewTargetBtn wizardPreviewSlideCard wizardPreviewSlideCard--add" type="button" data-add-theme="1" title="Thema toevoegen" aria-label="Thema toevoegen">' +
            '<span class="stijlSlideThumb wizardPreviewSlideThumb wizardPreviewSlideThumb--add"><span class="wizardPreviewSlideAddIcon">+</span></span>' +
            '<span class="stijlSlideBody wizardPreviewSlideBody"><span class="stijlSlideName">Thema</span></span>' +
          '</button>'
        )
        : '') +
    '</div>'
  );
}

function renderPreviewTargetCard(kind, themeId, label, selected) {
  var isCover = kind === 'cover';
  return (
    '<button class="stijlSlideCard wizardPreviewTargetBtn wizardPreviewSlideCard' + (selected ? ' sel is-active' : '') + '" type="button" data-preview-target="' + (isCover ? 'cover' : 'theme') + '"' + (isCover ? '' : ' data-preview-theme-id="' + esc(themeId) + '"') + ' role="tab" aria-selected="' + (selected ? 'true' : 'false') + '">' +
      renderPreviewTargetThumb(kind, themeId) +
      '<span class="stijlSlideBody wizardPreviewSlideBody"><span class="stijlSlideName">' + esc(label) + '</span></span>' +
    '</button>'
  );
}

function renderPreviewTargetThumb(kind, themeId) {
  var editorThumb = editorPreviewTargetThumbDataUrl(kind, themeId);
  if (editorThumb) {
    return (
      '<span class="stijlSlideThumb wizardPreviewSlideThumb wizardPreviewSlideThumb--image">' +
        '<img src="' + esc(editorThumb) + '" alt="">' +
      '</span>'
    );
  }
  var rendered = renderPreviewTargetThumbPreview(kind, themeId);
  if (rendered) {
    return (
      '<span class="stijlSlideThumb wizardPreviewSlideThumb wizardPreviewSlideThumb--rendered">' +
        rendered +
      '</span>'
    );
  }
  var isCover = kind === 'cover';
  var palette = getSelectedPalette();
  var card = effectiveCardColor();
  var accent = getAccentColor();
  var shape = isCover ? (palette.previewA || accent) : (palette.previewB || accent);
  return (
    '<span class="stijlSlideThumb wizardPreviewSlideThumb" style="--wizard-slide-card:' + esc(card) + ';--wizard-slide-accent:' + esc(accent) + ';--wizard-slide-shape:' + esc(shape) + '">' +
      '<span class="wizardPreviewSlideMiniCard">' +
        '<span class="wizardPreviewSlideShape wizardPreviewSlideShape--a"></span>' +
        '<span class="wizardPreviewSlideShape wizardPreviewSlideShape--b"></span>' +
      '</span>' +
    '</span>'
  );
}

function editorPreviewTargetThumbDataUrl(kind, themeId) {
  try {
    var parentWin = window.parent && window.parent !== window ? window.parent : null;
    if (!parentWin) return '';
    var dashboardState = parentWin.UITGESPROKEN_DASHBOARD_STATE || null;
    var bundle = (dashboardState && dashboardState.d) || null;
    if (!bundle || !bundle.meta) return '';
    if (kind === 'cover' && typeof parentWin.spacePreviewSetCoverDataUrl === 'function') {
      var setId = (dashboardState && (dashboardState.activeId || dashboardState._wizardSetId)) || state.existingSetId || 'wizard-thumb';
      return parentWin.spacePreviewSetCoverDataUrl({ id: setId, bundle: bundle }, bundle) || '';
    }
    if (typeof parentWin.styleThemeThumbDataUrl === 'function') {
      var records = buildThemeRecords();
      var record = records.find(function(item){ return item.id === themeId; }) || records[0] || { key: 'algemeen', file: 'kaart.svg' };
      return parentWin.styleThemeThumbDataUrl(bundle, record.key || 'algemeen', record.file || ((record.key || 'algemeen') + '.svg')) || '';
    }
  } catch (_err) {}
  return '';
}

function renderPreviewTargetThumbPreview(kind, themeId) {
  var renderer = window.PK && window.PK.sharedCardRenderer;
  if (!renderer || typeof renderer.render !== 'function') return '';
  var bundle = buildBundleFromDraft('wizard-thumb', state.wizardDraft.slug || 'wizard-thumb');
  var isCover = kind === 'cover';
  var themeRecords = buildThemeRecords();
  var record = themeRecords.find(function(item){ return item.id === themeId; }) || themeRecords[0] || { key: 'algemeen', label: 'Algemeen' };
  var questions = !isCover && bundle && bundle.questions && Array.isArray(bundle.questions[record.key])
    ? bundle.questions[record.key]
    : [];
  var firstQuestion = questions[0] || { voorkant: '', achterkant: '' };
  return renderer.render({
    meta: bundle.meta,
    wrapClass: 'stijlCardPrevWrap wizardPreviewSlideThumbRender',
    previewKey: isCover ? 'cover' : record.key,
    themeKey: isCover ? 'cover' : record.key,
    frontTxt: isCover ? '' : (firstQuestion.voorkant || firstQuestion.q || ''),
    backTxt: isCover ? '' : (firstQuestion.achterkant || firstQuestion.back || ''),
    backDesignKey: !isCover && firstQuestion && firstQuestion._qid ? ('__back_card__:' + firstQuestion._qid) : '',
    flipped: false,
    forceNoImage: true,
    showCoverTexts: isCover,
    coverTextsHtml: isCover ? buildCoverTextsHtml(bundle.meta) : '',
    suppressEmptyFrontHint: true
  });
}

function renderTypographySelectControls() {
  return (
    '<select id="typographyPresetSelect" class="wizardTypographyTopSelect" aria-label="Tekstsfeer">' +
      TYPOGRAPHY_PRESETS.map(function(item){
        var selected = item.id === state.wizardDraft.typography.preset ? ' selected' : '';
        return '<option value="' + esc(item.id) + '"' + selected + '>' + esc(item.label) + '</option>';
      }).join('') +
    '</select>' +
    '<select id="titleFontSelect" class="wizardTypographyTopSelect" aria-label="Titel lettertype">' +
      TYPOGRAPHY_FONT_OPTIONS.map(function(font){
        var selected = font === effectiveTitleFont() ? ' selected' : '';
        return '<option value="' + esc(font) + '"' + selected + '>' + esc(font) + '</option>';
      }).join('') +
    '</select>' +
    '<select id="bodyFontSelect" class="wizardTypographyTopSelect" aria-label="Tekst lettertype">' +
      TYPOGRAPHY_FONT_OPTIONS.map(function(font){
        var selected = font === effectiveBodyFont() ? ' selected' : '';
        return '<option value="' + esc(font) + '"' + selected + '>' + esc(font) + '</option>';
      }).join('') +
    '</select>'
  );
}

function renderTypographyPresetSelectBlock() {
  return (
    '<select id="typographyPresetSelect" class="wizardTypographyBlockSelect" aria-label="Tekstsfeer">' +
      TYPOGRAPHY_PRESETS.map(function(item){
        var selected = item.id === state.wizardDraft.typography.preset ? ' selected' : '';
        return '<option value="' + esc(item.id) + '"' + selected + '>' + esc(item.label) + '</option>';
      }).join('') +
    '</select>'
  );
}

function renderTypographyFontSelectBlock(id, currentFont, ariaLabel) {
  return (
    '<select id="' + esc(id) + '" class="wizardTypographyBlockSelect" aria-label="' + esc(ariaLabel) + '">' +
      TYPOGRAPHY_FONT_OPTIONS.map(function(font){
        var selected = font === currentFont ? ' selected' : '';
        return '<option value="' + esc(font) + '"' + selected + '>' + esc(font) + '</option>';
      }).join('') +
    '</select>'
  );
}

function renderTypographyPointSizeSelectBlock(id, currentValue, options, ariaLabel) {
  return (
    '<select id="' + esc(id) + '" class="wizardTypographyBlockSelect wizardTypographyBlockSelect--size" aria-label="' + esc(ariaLabel) + '">' +
      options.map(function(size){
        var selected = String(size) === String(currentValue) ? ' selected' : '';
        return '<option value="' + esc(size) + '"' + selected + '>' + esc(size + ' pt') + '</option>';
      }).join('') +
    '</select>'
  );
}

function renderTextAlignIcon(direction) {
  if (direction === 'left') return '<svg viewBox="0 0 16 16" aria-hidden="true"><line x1="3" y1="4" x2="13" y2="4"></line><line x1="3" y1="8" x2="10" y2="8"></line><line x1="3" y1="12" x2="13" y2="12"></line></svg>';
  if (direction === 'right') return '<svg viewBox="0 0 16 16" aria-hidden="true"><line x1="3" y1="4" x2="13" y2="4"></line><line x1="6" y1="8" x2="13" y2="8"></line><line x1="3" y1="12" x2="13" y2="12"></line></svg>';
  return '<svg viewBox="0 0 16 16" aria-hidden="true"><line x1="3" y1="4" x2="13" y2="4"></line><line x1="4.5" y1="8" x2="11.5" y2="8"></line><line x1="3" y1="12" x2="13" y2="12"></line></svg>';
}

function renderTextValignIcon(direction) {
  if (direction === 'top') return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="2.5" rx="1"></rect><rect x="4" y="7" width="8" height="6" rx="1.5" opacity=".35"></rect></svg>';
  if (direction === 'bottom') return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="8" height="6" rx="1.5" opacity=".35"></rect><rect x="3" y="10.5" width="10" height="2.5" rx="1"></rect></svg>';
  return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4.5" width="8" height="7" rx="1.5" opacity=".35"></rect><line x1="3" y1="8" x2="13" y2="8"></line></svg>';
}

function renderTextStyleButtons() {
  var weight = effectiveTextWeight();
  var italic = effectiveTextItalic();
  var underline = effectiveTextUnderline();
  return (
    '<div class="stijlTypoStyleGroup wizardTextCompactGroup" aria-label="Tekststijl">' +
      '<button class="textStyleIconBtn' + (weight !== 'regular' ? ' sel' : '') + '" type="button" data-text-bold="1" title="Vet" aria-label="Vet"><strong>B</strong></button>' +
      '<button class="textStyleIconBtn italic' + (italic ? ' sel' : '') + '" type="button" data-text-italic="1" title="Cursief" aria-label="Cursief"><em>I</em></button>' +
      '<button class="textStyleIconBtn underline' + (underline ? ' sel' : '') + '" type="button" data-text-underline="1" title="Onderstrepen" aria-label="Onderstrepen"><span style="text-decoration:underline">U</span></button>' +
    '</div>'
  );
}

function renderTextAlignButtons() {
  var align = effectiveTextAlign();
  var valign = effectiveTextValign();
  return (
    '<div class="wizardTextAlignRow">' +
      '<div class="stijlTypoAlignGroup wizardTextCompactGroup" aria-label="Uitlijning">' +
        ['left', 'center', 'right'].map(function(option){
          var labels = { left: 'Links', center: 'Midden', right: 'Rechts' };
          return '<button class="alignBtn' + (align === option ? ' sel' : '') + '" type="button" data-text-align="' + option + '" title="' + labels[option] + '" aria-label="' + labels[option] + '">' + renderTextAlignIcon(option) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="stijlTypoAlignGroup wizardTextCompactGroup" aria-label="Positie">' +
        ['top', 'center', 'bottom'].map(function(option){
          var labels = { top: 'Boven', center: 'Midden', bottom: 'Onder' };
          return '<button class="alignBtn' + (valign === option ? ' sel' : '') + '" type="button" data-text-valign="' + option + '" title="' + labels[option] + '" aria-label="' + labels[option] + '">' + renderTextValignIcon(option) + '</button>';
        }).join('') +
      '</div>' +
    '</div>'
  );
}

function renderTextColorButtonIcon(hex) {
  var stroke = normalizeHexInput(hex) || '#1a1a2e';
  return '<span class="textToolbarIcon textColorIcon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M4.6 13h6.8" stroke="' + esc(stroke) + '" stroke-width="2.2" stroke-linecap="round"></path><path d="M8 2.7l2.6 6.4M8 2.7L5.4 9.1M6.2 7.1h3.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>';
}

function renderTextColorQuickRow() {
  var current = String(effectiveTextColor() || '').trim().toLowerCase();
  return (
    '<div class="stijlTypoColorGroup wizardTextCompactGroup" aria-label="Tekstkleur">' +
      '<details class="textToolbarMenu wizardTextColorMenu">' +
        '<summary class="textToolbarMenuBtn" title="Tekstkleur" aria-label="Tekstkleur">' +
          renderTextColorButtonIcon(effectiveTextColor()) +
          '<span class="textToolbarCaret">▾</span>' +
        '</summary>' +
        '<div class="textToolbarMenuPop wizardTextColorPop">' +
          '<div class="textToolbarMenuLabel">Tekstkleur</div>' +
          '<div class="wizardTextColorMenuGrid">' +
            TEXT_COLOR_QUICK_SWATCHES.map(function(item){
              var value = String(item.a || '').trim();
              var isSelected = current === value.toLowerCase();
              return '<button class="textToolbarSwBtn' + (isSelected ? ' sel' : '') + '" type="button" data-text-color="' + esc(value) + '" title="' + esc(item.n || value) + '" aria-label="' + esc(item.n || value) + '" style="background:' + esc(value) + '"></button>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</details>' +
    '</div>'
  );
}

function renderTypographyFontMenuBlock(role, currentFont, ariaLabel) {
  var current = normalizeTypographyFont(currentFont, TYPOGRAPHY_FONT_OPTIONS[0]);
  return (
    '<details class="textToolbarMenu wizardTextToolbarMenu wizardTextToolbarMenu--font">' +
      '<summary class="textToolbarMenuBtn fontMenuBtn" title="' + esc(ariaLabel) + '" aria-label="' + esc(ariaLabel) + '" style="font-family:' + esc(current) + '">' +
        '<span class="fontMenuLabel">' + esc(current) + '</span>' +
        '<span class="textToolbarCaret">▾</span>' +
      '</summary>' +
      '<div class="textToolbarMenuPop fontMenuPop">' +
        '<div class="textToolbarMenuLabel">Lettertype</div>' +
        '<div class="textToolbarMenuGrid">' +
          TYPOGRAPHY_FONT_OPTIONS.map(function(font){
            return '<button class="textToolbarMenuItem' + (font === current ? ' sel' : '') + '" type="button" data-text-font-role="' + esc(role) + '" data-text-font-option="' + esc(font) + '" style="font-family:' + esc(font) + ';font-size:12px"><span>' + esc(font) + '</span></button>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</details>'
  );
}

function renderTypographyPointSizeMenuBlock(role, currentValue, options, ariaLabel) {
  var current = String(currentValue || options[0] || '12');
  return (
    '<details class="textToolbarMenu wizardTextToolbarMenu wizardTextToolbarMenu--size">' +
      '<summary class="textToolbarMenuBtn sizeMenuBtn" title="' + esc(ariaLabel) + '" aria-label="' + esc(ariaLabel) + '">' +
        '<span class="fontSizeLabelText">' + esc(current) + ' pt</span>' +
        '<span class="textToolbarCaret">▾</span>' +
      '</summary>' +
      '<div class="textToolbarMenuPop">' +
        '<div class="textToolbarMenuLabel">Tekstgrootte</div>' +
        '<div class="textToolbarMenuGrid">' +
          options.map(function(size){
            return '<button class="textToolbarMenuItem' + (String(size) === current ? ' sel' : '') + '" type="button" data-text-size-role="' + esc(role) + '" data-text-size-option="' + esc(size) + '"><span>' + esc(size) + ' pt</span></button>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</details>'
  );
}

function renderTypographyQuickControls() {
  return (
    '<div class="wizardTypographyTopbar" aria-label="Tekst instellingen">' +
      renderTypographySelectControls() +
    '</div>'
  );
}

function renderTypographyTargetButton(target, label) {
  var selected = normalizeTypographyTarget(state.typographyTarget) === target;
  return (
    '<button class="wizardTypographyTargetBtn' + (selected ? ' is-active' : '') + '" type="button" data-typography-target="' + esc(target) + '" role="tab" aria-selected="' + (selected ? 'true' : 'false') + '">' +
      esc(label) +
    '</button>'
  );
}

function renderEmbeddedDesignToolbar() {
  var subIndex = getDesignSubstepIndex() + 1;
  return (
    '<div class="wizardFrameToolbar wizardFrameToolbar--design">' +
      '<div class="wizardDesignTabs" role="tablist" aria-label="Ontwerp onderdelen">' +
        DESIGN_SUBSTEPS.map(function(item){
          var selected = item.id === state.designSubstep;
          return '<button class="wizardDesignTab' + (selected ? ' is-active' : '') + '" type="button" data-design-substep="' + item.id + '" role="tab" aria-selected="' + (selected ? 'true' : 'false') + '">' + esc(item.label) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="wizardFrameToolbarMeta">Onderdeel ' + subIndex + ' van ' + DESIGN_SUBSTEPS.length + '</div>' +
    '</div>'
  );
}

function renderFrameStepMenu(currentHeading) {
  return (
    '<details class="wizardStepMenu">' +
      '<summary class="wizardStepMenuTrigger" aria-label="Kies een andere stap">' +
        '<span class="wizardFrameIndex wizardFrameIndex--menu">' + (state.stepIndex + 1) + '</span>' +
        '<strong class="wizardFrameHeading">' + esc(currentHeading) + '</strong>' +
        '<span class="wizardStepMenuChevron" aria-hidden="true">' + iconMarkup('chevron-down') + '</span>' +
      '</summary>' +
      '<div class="wizardStepMenuList" role="menu" aria-label="Wizard stappen">' +
        STEP_DEFS.map(function(step, index){
          var isCurrent = index === state.stepIndex;
          var done = isStepDone(index);
          var jumpable = canJumpToStep(index) || isCurrent;
          var cls = 'wizardStepMenuItem';
          if (isCurrent) cls += ' is-current';
          else if (done) cls += ' is-done';
          else if (!jumpable) cls += ' is-locked';
          return (
            '<button class="' + cls + '" type="button" data-jump-step="' + index + '" role="menuitem"' + (jumpable ? '' : ' disabled') + '>' +
              '<span class="wizardStepMenuItemIndex">' + (index + 1) + '</span>' +
              '<span class="wizardStepMenuItemLabel">' + esc(step.label) + '</span>' +
              '<span class="wizardStepMenuItemState" aria-hidden="true">' + (done && !isCurrent ? iconMarkup('check') : '') + '</span>' +
            '</button>'
          );
        }).join('') +
      '</div>' +
    '</details>'
  );
}

function renderMainPanel() {
  var stepId = currentStepId();
  return (
    '<div class="wizardStepContent wizardStepContent--' + stepId + '">' +
      (state.error ? '<div class="wizardAlert">' + esc(state.error) + '</div>' : '') +
      renderCurrentStep() +
    '</div>'
  );
}

function renderCurrentStep() {
  switch (STEP_DEFS[state.stepIndex].id) {
    case 'name':
      return renderNameStep();
    case 'themes':
      return renderThemesStep();
    case 'format':
      return renderFormatStep();
    case 'design':
      return renderDesignStep();
    case 'questions':
      return renderQuestionsStep();
    case 'cover':
      return renderCoverStep();
    case 'publish':
      return renderPublicationStep();
    case 'done':
      return renderDoneStep();
    default:
      return '';
  }
}

function renderNameStep() {
  var draft = state.wizardDraft;
  var linkUser = state.username ? String(state.username).trim() : 'jij';
  var linkName = draft.slug || 'linknaam';
  return (
    '<h1 class="wizardTitle">Hoe heet je kaartenset?</h1>' +
    '<p class="wizardLead">Geef je set een naam. Je kunt dit later nog aanpassen.</p>' +
    '<div class="wizardField">' +
      '<label for="setNameInput">Naam van je kaartenset</label>' +
      '<input id="setNameInput" class="wizardInput" type="text" value="' + esc(draft.name) + '" placeholder="bijv. Diep Luisteren" autocomplete="off">' +
    '</div>' +
    '<div class="wizardSlugRow">' +
      '<div class="wizardSlugLabel">Jouw kaartlink</div>' +
      '<div class="wizardSlugShell">' +
        '<span class="wizardSlugPrefix">' + esc(publicSiteOrigin() + '/@' + linkUser + '/') + '</span>' +
        (
          state.slugEditorOpen
            ? '<input id="slugInput" class="wizardInput" type="text" value="' + esc(draft.slug || '') + '" placeholder="diep-luisteren" aria-label="Linknaam" style="min-height:42px;padding:10px 14px;font-size:14px;max-width:240px">'
            : '<span class="wizardSlugChip">' + esc(linkName) + '</span>'
        ) +
        '<button class="wizardMiniBtn" type="button" data-toggle-slug="1">' +
          iconMarkup('edit') +
          '<span>' + (state.slugEditorOpen ? 'Klaar' : 'Bewerk') + '</span>' +
        '</button>' +
      '</div>' +
    '</div>'
  );
}

function renderThemesStep() {
  var draft = state.wizardDraft;
  var themeMode = normalizeThemeMode(draft.themeMode);
  var activeTheme = getActiveTheme();
  var themeCount = Array.isArray(draft.themes) ? draft.themes.length : 0;
  return (
    '<h1 class="wizardTitle">Hoe deel je je set op?</h1>' +
    '<p class="wizardLead">Bepaal eerst de inhoudelijke structuur. Daarna vul je in de volgende stap per thema de vragen in.</p>' +
    '<div class="wizardField wizardThemeModeField">' +
      '<label>Werk je met &eacute;&eacute;n kaartgroep of met meerdere thema&apos;s?</label>' +
      '<div class="wizardThemeModeSwitch" role="radiogroup" aria-label="Aantal thema&apos;s">' +
        renderThemeModeButton('single', 'Eén thema', 'Rustig starten met één kaartgroep en één vaste invalshoek.', themeMode) +
        renderThemeModeButton('multiple', 'Meerdere thema\'s', 'Handig voor hoofdstukken, subonderwerpen of verschillende gesprekspaden.', themeMode) +
      '</div>' +
    '</div>' +
    '<div class="wizardThemeEditor">' +
      '<div class="wizardThemeBar">' +
        draft.themes.map(function(theme, index){
          var selected = theme.id === state.activeThemeId;
          return (
            '<button class="wizardThemeChip' + (selected ? ' is-selected' : '') + '" type="button" data-theme-select="' + theme.id + '">' +
              '<span class="wizardThemeChipDot"></span>' +
              '<span>' + esc(theme.name || ('Thema ' + (index + 1))) + '</span>' +
            '</button>'
          );
        }).join('') +
        (themeMode === 'multiple' ? '<button class="wizardMiniBtn" type="button" data-add-theme="1">Thema toevoegen</button>' : '') +
        (themeMode === 'multiple' && themeCount > 1
          ? '<button class="wizardMiniBtn" type="button" data-remove-theme="' + esc(state.activeThemeId) + '">Actief thema verwijderen</button>'
          : '') +
      '</div>' +
      '<div class="wizardField">' +
        '<label for="themeNameInput">' + (themeMode === 'multiple' ? 'Naam van dit thema' : 'Naam van je kaartgroep') + '</label>' +
        '<input id="themeNameInput" class="wizardInput" type="text" value="' + esc(activeTheme ? activeTheme.name : '') + '" placeholder="' + esc(themeMode === 'multiple' ? 'bijv. Samenwerking' : 'bijv. Algemene set') + '">' +
      '</div>' +
      '<div class="wizardMuted">' +
        (themeMode === 'multiple'
          ? 'Je hebt nu ' + themeCount + ' thema' + (themeCount === 1 ? '' : '\'s') + ' klaarstaan. In de volgende stap voeg je per thema de vragen toe.'
          : 'Alles wat je hierna maakt komt onder dit ene thema te hangen. Later kun je dit in de editor nog verder uitsplitsen.') +
      '</div>' +
    '</div>'
  );
}

function renderThemeModeButton(value, title, body, current) {
  var selected = current === value;
  return (
    '<button class="wizardThemeModeBtn' + (selected ? ' is-selected' : '') + '" type="button" data-theme-mode="' + esc(value) + '" role="radio" aria-checked="' + (selected ? 'true' : 'false') + '">' +
      '<strong>' + esc(title) + '</strong>' +
      '<span>' + esc(body) + '</span>' +
    '</button>'
  );
}

function renderFormatStep() {
  return (
    '<h1 class="wizardTitle">Welk formaat hebben je kaarten?</h1>' +
    '<p class="wizardLead">Kies het formaat dat het beste bij jouw set past. Liggend staat alvast voor je klaar als rustige standaard.</p>' +
    '<div class="wizardFormatStripWrap">' +
      wizardFormatStripHtml(state.wizardDraft.format) +
    '</div>'
    + '<p class="wizardLead" style="font-size:13px;margin-top:18px">Deze keuze werkt meteen door in de live preview en blijft later in de editor gewoon aanpasbaar.</p>'
  );
}

function wizardFormatStripHtml(currentId) {
  var maxW = 52;
  var maxH = 68;
  return '<div class="fmtStrip wizardFmtStrip">' +
    FORMAT_OPTIONS.map(function(format){
      var selected = format.id === currentId;
      var ratio = format.width / format.height;
      var thumbW;
      var thumbH;
      if (format.width / maxW > format.height / maxH) {
        thumbW = maxW;
        thumbH = Math.round(maxW / ratio);
      } else {
        thumbH = maxH;
        thumbW = Math.round(maxH * ratio);
      }
      return '<button type="button" class="fmtTile wizardFmtTile' + (selected ? ' sel' : '') + '" data-format-choice="' + format.id + '" title="' + esc(format.note) + '">' +
        '<div class="fmtThumbWrap">' +
          '<div class="fmtThumb" style="width:' + thumbW + 'px;height:' + thumbH + 'px"></div>' +
        '</div>' +
        '<div class="fmtName">' + esc(format.label) + '</div>' +
        '<div class="fmtDim">' + esc(format.note.replace(/\s*x\s*/i, ' × ')) + '</div>' +
      '</button>';
    }).join('') +
  '</div>';
}

function renderDesignStep() {
  var substep = getDesignSubstep();
  var subIndex = getDesignSubstepIndex() + 1;
  var content = renderCurrentDesignPanel();
  if (isEmbeddedMode()) {
    return (
      '<div class="wizardEditorSidebarStack wizardDesignWorkspaceSidebar">' +
        renderEmbeddedDesignWorkspace() +
      '</div>'
    );
  }
  return (
    '<h1 class="wizardTitle">Ontwerp je kaart</h1>' +
    '<div class="wizardDesignSubflow">' +
      '<div class="wizardDesignSubflowHead">' +
        '<div class="wizardDesignTabs" role="tablist" aria-label="Ontwerp onderdelen">' +
          DESIGN_SUBSTEPS.map(function(item){
            var selected = item.id === substep.id;
            return '<button class="wizardDesignTab' + (selected ? ' is-active' : '') + '" type="button" data-design-substep="' + item.id + '" role="tab" aria-selected="' + (selected ? 'true' : 'false') + '">' + esc(item.label) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="wizardDesignSubflowMeta">Onderdeel ' + subIndex + ' van ' + DESIGN_SUBSTEPS.length + '</div>' +
      '</div>' +
      content +
    '</div>'
  );
}

function renderCurrentDesignPanel() {
  var substep = getDesignSubstep();
  if (substep.id === 'shapes') return renderDesignShapesPanel();
  if (substep.id === 'colors') return renderDesignColorsPanel();
  if (substep.id === 'background') return renderDesignBackgroundPanel();
  return renderDesignTypographyPanel();
}

function renderEmbeddedDesignShortcutNav() {
  return (
    '<nav class="wizardDesignShortcutNav" aria-label="Ontwerp onderdelen">' +
      DESIGN_SUBSTEPS.map(function(item){
        var selected = item.id === getDesignSubstep().id;
        return (
          '<button class="wizardDesignShortcut' + (selected ? ' is-active' : '') + '" type="button" data-design-substep="' + item.id + '" aria-current="' + (selected ? 'true' : 'false') + '">' +
            esc(item.label) +
          '</button>'
        );
      }).join('') +
    '</nav>'
  );
}

function designSectionId(id) {
  return 'wizardDesignSection-' + normalizeDesignSubstepId(id);
}

function renderEmbeddedDesignAnchorSection(item, content) {
  var active = getDesignSubstep().id === item.id;
  return (
    '<section class="wizardDesignAnchorSection' + (active ? ' is-active' : '') + '" id="' + designSectionId(item.id) + '" data-design-section="' + item.id + '">' +
      content +
    '</section>'
  );
}

function renderEmbeddedDesignWorkspaceSection(item, content) {
  var active = getDesignSubstep().id === item.id;
  return (
    '<section class="wizardDesignWorkspaceSection' + (active ? ' is-active' : '') + '" id="' + designSectionId(item.id) + '" data-design-section="' + item.id + '">' +
      content +
    '</section>'
  );
}

function renderEmbeddedDesignWorkspace() {
  return (
    '<div class="wizardDesignWorkspace" aria-label="Ontwerp werkveld">' +
      renderEmbeddedDesignWorkspaceSection(DESIGN_SUBSTEPS[0], renderDesignShapesPanel()) +
      renderEmbeddedDesignWorkspaceSection(DESIGN_SUBSTEPS[1], renderDesignColorsPanel()) +
      renderEmbeddedDesignWorkspaceSection(DESIGN_SUBSTEPS[2], renderDesignBackgroundPanel()) +
      renderEmbeddedDesignWorkspaceSection(DESIGN_SUBSTEPS[3], renderDesignTypographyPanel()) +
    '</div>'
  );
}

function scrollEmbeddedDesignSection(id, behavior) {
  var target = root.querySelector('#' + designSectionId(id));
  if (!target || typeof target.scrollIntoView !== 'function') return;
  target.scrollIntoView({
    behavior: behavior || 'smooth',
    block: 'start'
  });
}

function wizardContextMenuIcon(name) {
  if (name === 'front') return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="5.5" width="8" height="6" rx="1.2"></rect><rect x="10.5" y="12.5" width="8" height="6" rx="1.2" opacity=".35"></rect></svg>';
  if (name === 'back') return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="10" y="5.5" width="8" height="6" rx="1.2" opacity=".35"></rect><rect x="5.5" y="12.5" width="8" height="6" rx="1.2"></rect></svg>';
  if (name === 'duplicate') return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="7" width="10" height="10" rx="1.6"></rect><rect x="9" y="4" width="10" height="10" rx="1.6" opacity=".4"></rect></svg>';
  return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>';
}

function getWizardPreviewContextMenu() {
  if (wizardPreviewContextMenu && document.body.contains(wizardPreviewContextMenu)) return wizardPreviewContextMenu;
  var menu = document.createElement('div');
  menu.className = 'shapeContextMenu hidden wizardPreviewContextMenu';
  menu.innerHTML =
    '<button type="button" data-wizard-context-action="front">' + wizardContextMenuIcon('front') + 'Naar voren</button>' +
    '<button type="button" data-wizard-context-action="back">' + wizardContextMenuIcon('back') + 'Naar achter</button>' +
    '<div class="shapeContextSep" role="separator"></div>' +
    '<button type="button" data-wizard-context-action="duplicate">' + wizardContextMenuIcon('duplicate') + 'Dupliceren</button>' +
    '<button type="button" data-wizard-context-action="delete" class="is-danger">' + wizardContextMenuIcon('delete') + 'Verwijderen</button>';
  menu.addEventListener('mousedown', function(ev){
    ev.preventDefault();
    ev.stopPropagation();
  });
  menu.addEventListener('contextmenu', function(ev){
    ev.preventDefault();
    ev.stopPropagation();
  });
  menu.addEventListener('click', function(ev){
    var button = ev.target.closest('[data-wizard-context-action]');
    if (!button || button.disabled || button.classList.contains('is-disabled')) return;
    runWizardPreviewContextAction(button.getAttribute('data-wizard-context-action') || '');
  });
  document.body.appendChild(menu);
  wizardPreviewContextMenu = menu;
  return menu;
}

function closeWizardPreviewContextMenu() {
  var menu = getWizardPreviewContextMenu();
  menu.classList.add('hidden');
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
  wizardPreviewContextState = null;
}

function moveItemInArray(list, fromIndex, toIndex) {
  if (!Array.isArray(list)) return false;
  if (fromIndex === toIndex) return false;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return false;
  var item = list.splice(fromIndex, 1)[0];
  list.splice(toIndex, 0, item);
  return true;
}

function duplicateWizardShapeLayer(layerId) {
  var layers = ensureDesignShapeLayers();
  var index = layers.findIndex(function(layer){ return layer.id === layerId; });
  if (index < 0) return false;
  var source = layers[index];
  var copy = defaultDesignShapeLayer({
    type: source.type,
    x: clamp(Number(source.x) + 8, -25, 125),
    y: clamp(Number(source.y) + 8, -25, 125),
    size: clamp(Number(source.size), 12, 120),
    rotate: clamp(Number(source.rotate), -180, 180),
    colorMode: source.colorMode === 'custom' ? 'custom' : 'palette',
    paletteRole: normalizeDesignShapePaletteRole(source.paletteRole, index),
    fill: String(source.fill || '').trim(),
    fillOpacity: Math.max(0, Math.min(1, Number(source.fillOpacity) || 0.92))
  });
  layers.splice(index + 1, 0, copy);
  state.wizardDraft.design.activeShapeLayerId = copy.id;
  syncLegacyShapeFields();
  return true;
}

function deleteWizardShapeLayer(layerId) {
  var layers = ensureDesignShapeLayers();
  if (layers.length <= 1) return false;
  var index = layers.findIndex(function(layer){ return layer.id === layerId; });
  if (index < 0) return false;
  layers.splice(index, 1);
  state.wizardDraft.design.activeShapeLayerId = (layers[Math.max(0, index - 1)] || layers[0] || {}).id || '';
  syncLegacyShapeFields();
  return true;
}

function duplicateWizardCoverText(idx) {
  var list = ensureWizardCoverTexts();
  if (idx < 0 || idx >= list.length) return false;
  var source = Object.assign({}, list[idx]);
  source.x = clamp(Number(source.x) + 4, 8, 92);
  source.y = clamp(Number(source.y) + 4, 12, 88);
  list.splice(idx + 1, 0, source);
  setActiveWizardCoverTextIndex(idx + 1);
  return true;
}

function deleteWizardCoverText(idx) {
  var list = ensureWizardCoverTexts();
  if (idx < 0 || idx >= list.length) return false;
  list.splice(idx, 1);
  setActiveWizardCoverTextIndex(Math.max(0, idx - 1));
  return true;
}

function refreshWizardPreviewContextMenu() {
  var menu = getWizardPreviewContextMenu();
  var ctx = wizardPreviewContextState;
  var frontBtn = menu.querySelector('[data-wizard-context-action="front"]');
  var backBtn = menu.querySelector('[data-wizard-context-action="back"]');
  var duplicateBtn = menu.querySelector('[data-wizard-context-action="duplicate"]');
  var deleteBtn = menu.querySelector('[data-wizard-context-action="delete"]');
  var maxIndex = 0;
  var duplicateLabel = 'Dupliceren';
  var deleteLabel = 'Verwijderen';
  if (ctx && ctx.type === 'shape') {
    var shapeLayers = ensureDesignShapeLayers();
    maxIndex = Math.max(0, shapeLayers.length - 1);
  } else if (ctx && ctx.type === 'coverText') {
    var coverTexts = ensureWizardCoverTexts();
    maxIndex = Math.max(0, coverTexts.length - 1);
    duplicateLabel = 'Tekst dupliceren';
    deleteLabel = 'Tekst verwijderen';
  }
  if (frontBtn) frontBtn.innerHTML = wizardContextMenuIcon('front') + 'Naar voren';
  if (backBtn) backBtn.innerHTML = wizardContextMenuIcon('back') + 'Naar achter';
  if (duplicateBtn) duplicateBtn.innerHTML = wizardContextMenuIcon('duplicate') + duplicateLabel;
  if (deleteBtn) deleteBtn.innerHTML = wizardContextMenuIcon('delete') + deleteLabel;
  if (frontBtn) {
    var disableFront = !ctx || ctx.index >= maxIndex;
    frontBtn.disabled = disableFront;
    frontBtn.classList.toggle('is-disabled', disableFront);
  }
  if (backBtn) {
    var disableBack = !ctx || ctx.index <= 0;
    backBtn.disabled = disableBack;
    backBtn.classList.toggle('is-disabled', disableBack);
  }
}

function openWizardPreviewContextMenu(ev, ctx) {
  if (!ev || !ctx) return false;
  ev.preventDefault();
  ev.stopPropagation();
  wizardPreviewContextState = ctx;
  refreshWizardPreviewContextMenu();
  var menu = getWizardPreviewContextMenu();
  menu.classList.remove('hidden');
  menu.style.left = Math.round(ev.clientX + 8) + 'px';
  menu.style.top = Math.round(ev.clientY + 8) + 'px';
  return false;
}

function runWizardPreviewContextAction(action) {
  var ctx = wizardPreviewContextState;
  if (!ctx || !action) return;
  var didChange = false;
  if (ctx.type === 'shape') {
    var layers = ensureDesignShapeLayers();
    var fromIndex = layers.findIndex(function(layer){ return layer.id === ctx.layerId; });
    if (fromIndex >= 0) {
      if (action === 'front') didChange = moveItemInArray(layers, fromIndex, Math.min(layers.length - 1, fromIndex + 1));
      else if (action === 'back') didChange = moveItemInArray(layers, fromIndex, Math.max(0, fromIndex - 1));
      else if (action === 'duplicate') didChange = duplicateWizardShapeLayer(ctx.layerId);
      else if (action === 'delete') didChange = deleteWizardShapeLayer(ctx.layerId);
    }
  } else if (ctx.type === 'coverText') {
    var coverTexts = ensureWizardCoverTexts();
    if (ctx.index >= 0 && ctx.index < coverTexts.length) {
      var nextIndex = ctx.index;
      if (action === 'front') {
        nextIndex = Math.min(coverTexts.length - 1, ctx.index + 1);
        didChange = moveItemInArray(coverTexts, ctx.index, nextIndex);
      } else if (action === 'back') {
        nextIndex = Math.max(0, ctx.index - 1);
        didChange = moveItemInArray(coverTexts, ctx.index, nextIndex);
      }
      else if (action === 'duplicate') didChange = duplicateWizardCoverText(ctx.index);
      else if (action === 'delete') didChange = deleteWizardCoverText(ctx.index);
      if (didChange && action !== 'duplicate' && action !== 'delete') setActiveWizardCoverTextIndex(nextIndex);
    }
  }
  closeWizardPreviewContextMenu();
  if (didChange) commitWizardChange(false);
}

function renderShapeLayerChipRow() {
  var layers = ensureDesignShapeLayers();
  var active = getActiveDesignShapeLayer();
  var selectionActive = wizardDesignSelectionActive() || !!(active && active.id);
  return (
    '<div class="shapeLayerBar wizardShapeLayerBar">' +
      layers.map(function(layer, index){
        var selected = !!(selectionActive && active && active.id === layer.id);
        var label = getShapeLabel(layer.type) + ' ' + (index + 1);
        return (
          '<button class="shapeChip' + (selected ? ' sel active' : '') + '" type="button" data-shape-layer-select="' + esc(layer.id) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '">' +
            renderMiniShapeLayerSvg(layer) +
          '</button>'
        );
      }).join('') +
      (layers.length < 6
        ? '<button class="shapeLayerAdd" type="button" data-shape-layer-add="1" title="Vormlaag toevoegen" aria-label="Vormlaag toevoegen">+</button>'
        : '') +
      (layers.length > 1
        ? '<button class="shapeLayerDelete" type="button" data-shape-layer-remove="1" title="Actieve vorm verwijderen" aria-label="Actieve vorm verwijderen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg></button>'
        : '') +
    '</div>'
  );
}

function isDesignPanelOpen(panel) {
  var key = String(panel || '').trim();
  if (!key) return true;
  state.designPanelOpen = state.designPanelOpen || {};
  return Object.prototype.hasOwnProperty.call(state.designPanelOpen, key)
    ? state.designPanelOpen[key] !== false
    : true;
}

function buildWizardSectionChevronSvg(open) {
  return '<svg class="sectionChevronIcon' + (open ? ' is-open' : '') + '" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5L5 6.5L8 3.5"/></svg>';
}

function renderWizardSectionToggle(label, open, attrs, variant) {
  var attr = attrs ? ' ' + attrs : '';
  var typeClass = variant === 'inline' ? 'sectionCollapseBtnInline' : 'sectionCollapseBtnCard';
  return (
    '<button class="sectionCollapseBtn ' + typeClass + (open ? ' is-open' : '') + '" type="button"' + attr + ' title="' + esc(open ? 'Inklappen' : 'Uitklappen') + '" aria-label="' + esc(label) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
      '<div class="sectionCollapseLabel"><div class="stijlSectionLabel">' + esc(label) + '</div></div>' +
      '<span class="sectionChevronWrap" aria-hidden="true">' + buildWizardSectionChevronSvg(open) + '</span>' +
    '</button>'
  );
}

function renderEditorMiniCard(title, body, options) {
  options = options || {};
  var open = options.panel ? isDesignPanelOpen(options.panel) : options.open !== false;
  var classes = 'stijlMiniCard' + (options.tight === false ? '' : ' tight') + (open ? '' : ' is-collapsed') + (options.className ? ' ' + options.className : '');
  var dataTip = options.tip ? ' data-tip="' + esc(options.tip) + '"' : '';
  var toggleAttrs = options.panel
    ? 'data-wizard-panel-toggle="' + esc(options.panel) + '"'
    : (options.toggleAttr || '');
  return (
    '<section class="' + classes + '"' + dataTip + '>' +
      (title
        ? '<div class="stijlMiniHead">' + renderWizardSectionToggle(title, open, toggleAttrs) + '</div>'
        : '') +
      (open ? body : '') +
    '</section>'
  );
}

function renderDesignShapesPanel() {
  var query = String(state.iconSearchQuery || '').trim();
  var searchResults = filteredDesignIcons();
  var quickIcons = DESIGN_ICON_QUICK_IDS.map(function(id){
    return getPresetById(ICON_PRESETS, id, null);
  }).filter(Boolean);
  var activeShape = currentDesignShapeState();
  var activeShapeId = String(activeShape && activeShape.type || '').trim();
  var selectionActive = wizardDesignSelectionActive() || !!(activeShape && activeShape.id);
  var quickIconItems = [ICON_PRESETS[0]].concat(quickIcons);
  var activeFill = effectiveShapeLayerColor(activeShape);
  var activeTone = clamp(Number(activeShape.fillTone), -100, 100);
  var activeOpacity = Math.round(Math.max(0, Math.min(1, Number(activeShape.fillOpacity) || 0.92)) * 100);
  var shapesOpen = isDesignPanelOpen('shapes');
  var shapeChoices = [{ id: EMPTY_SHAPE_PRESET_ID, label: 'Geen vorm', isNone: true }].concat(SHAPE_PRESETS);
  return (
    '<section class="stijlMiniCard tight wizardEditorMiniCard wizardEditorMiniCard--shapes' + (shapesOpen ? '' : ' is-collapsed') + '" data-tip="vormen">' +
    (isEmbeddedMode()
      ? '<div class="wizardEditorMiniCardNav">' + renderEmbeddedDesignShortcutNav() + '</div>'
      : '') +
    '<div class="shapeEditor wizardShapeEditor" data-shape-key="cover">' +
    '<div class="stijlShapes">' +
      renderWizardSectionToggle('Vormen', shapesOpen, 'data-wizard-panel-toggle="shapes"', 'inline') +
      (shapesOpen ? (
      '<div class="shapeActiveWrap wizardShapeActiveWrap">' +
        '<div class="shapeActiveLabel">Actieve vormen</div>' +
        renderShapeLayerChipRow() +
      '</div>' +
      '<div class="shapeGrid wizardShapeEditorGrid">' +
        '<div class="shapeField wizardShapeField">' +
          '<div class="shapeLibraryLabel">Vormen</div>' +
          '<div class="shapeTypeBar wizardDesignShapeGrid">' +
            shapeChoices.map(function(shape){
              var selected = !!(selectionActive && activeShapeId === shape.id);
              return (
                '<button class="shapeTypeBtn' + (selected ? ' sel' : '') + '" type="button" data-shape-choice="' + shape.id + '" title="' + esc(shape.label) + '" aria-label="' + esc(shape.label) + '">' +
                  renderMiniShapeSvg(shape.id) +
                '</button>'
              );
            }).join('') +
            '<label class="shapeTypeImportBtn wizardShapeTypeImportBtn" title="SVG vorm toevoegen" aria-label="SVG vorm toevoegen">' +
              '<span>+</span><input type="file" accept=".svg,image/svg+xml" data-shape-svg-import="1">' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="iconLibrary wizardDesignIconLibrary">' +
          '<div class="iconLibraryHead"><div class="shapeLibraryLabel">Iconen</div></div>' +
          '<div class="iconGridMini wizardDesignIconGrid wizardDesignIconQuickRow">' +
            quickIconItems.map(function(icon){
              var selected = !!(selectionActive && String(state.wizardDraft.design.iconPreset || '').trim() === icon.id);
              return (
                '<button class="iconChip' + (selected ? ' sel' : '') + '" type="button" data-icon-choice="' + icon.id + '" title="' + esc(icon.label) + '" aria-label="' + esc(icon.label) + '">' +
                  (icon.markup ? renderMiniIconSvg(icon) : '<span class="wizardIconNoneDash" aria-hidden="true"></span>') +
                '</button>'
              );
            }).join('') +
          '</div>' +
          '<input id="iconSearchInput" class="iconSearch wizardIconSearchInput" type="search" value="' + esc(state.iconSearchQuery || '') + '" placeholder="Zoek in het Engels, bv. arrow of heart" autocomplete="off">' +
          (query.length >= 2
            ? (searchResults.length
                ? '<div class="iconGridMini wizardDesignIconGrid wizardDesignIconSearchResults">' +
                    searchResults.slice(0, 8).map(function(icon){
                      var selected = !!(selectionActive && String(state.wizardDraft.design.iconPreset || '').trim() === icon.id);
                      return (
                        '<button class="iconChip' + (selected ? ' sel' : '') + '" type="button" data-icon-choice="' + icon.id + '" title="' + esc(icon.label) + '" aria-label="' + esc(icon.label) + '">' +
                          (icon.markup ? renderMiniIconSvg(icon) : '<span class="wizardIconNoneDash" aria-hidden="true"></span>') +
                        '</button>'
                      );
                    }).join('') +
                  '</div>'
                : '<div class="iconEmpty">Geen iconen gevonden.</div>')
            : '') +
        '</div>' +
        '<div class="shapeSubsection wizardShapeAdjustSubsection">' +
          '<div class="shapeLibraryLabel">Bewerken</div>' +
          '<div class="shapeEditCluster">' +
            '<div class="shapeSliderRow">' +
              '<div class="shapeSliderHRow">' +
                '<span class="shapeSliderHLbl">Grootte</span>' +
                '<input class="shapeSlider" data-shape-size="1" style="flex:1;--pct:' + sliderPercent(activeShape.size, 12, 120) + '%" type="range" min="12" max="120" step="1" value="' + activeShape.size + '">' +
                '<span class="shapeSliderValPill" data-shape-size-label="1">' + sliderValueHtml(activeShape.size, '') + '</span>' +
              '</div>' +
              '<div class="shapeSliderHRow">' +
                '<span class="shapeSliderHLbl">Rotatie</span>' +
                '<input class="shapeSlider" data-shape-rotate="1" style="flex:1;--pct:' + sliderPercent(activeShape.rotate, -180, 180) + '%" type="range" min="-180" max="180" step="1" value="' + activeShape.rotate + '">' +
                '<span class="shapeSliderValPill" data-shape-rotate-label="1">' + sliderValueHtml(activeShape.rotate, '°') + '</span>' +
              '</div>' +
            '</div>' +
              '<div class="shapeStaticSection">' +
                '<div class="shapeLibraryLabel">Kleur</div>' +
                '<div class="shapePaintRow" style="display:flex;align-items:center;gap:8px;margin-bottom:0">' +
                  '<div class="shapePaintTabs">' +
                    '<button class="shapePaintBtn fill sel" type="button" aria-label="Vulling"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12 12 21 4 12Z"/></svg></button>' +
                  '<button class="shapePaintBtn stroke" type="button" aria-label="Outline" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12 12 21 4 12Z"/></svg></button>' +
                  '</div>' +
                '</div>' +
              renderEditorPaletteHtml('shapeFill', STANDARD_BACKGROUND_ROWS, activeFill, 'data-shape-fill', {
                inputAttr: 'data-shape-fill-input',
                currentTitle: 'Eigen vormkleur kiezen'
              }) +
              '<div class="shapeSliderRow">' +
                '<div class="shapeSliderHRow">' +
                  '<span class="shapeSliderHLbl">Kleurtoon</span>' +
                  '<input class="shapeSlider" data-shape-fill-tone="1" style="flex:1;--pct:' + sliderPercent(activeTone, -100, 100) + '%" type="range" min="-100" max="100" step="1" value="' + activeTone + '">' +
                  '<span class="shapeSliderValPill" data-shape-fill-tone-label="1">' + sliderValueHtml((activeTone > 0 ? '+' : '') + activeTone, '') + '</span>' +
                '</div>' +
                '<div class="shapeSliderHRow">' +
                  '<span class="shapeSliderHLbl">Opacity</span>' +
                  '<input class="shapeSlider" data-shape-fill-opacity="1" style="flex:1;--pct:' + sliderPercent(activeOpacity, 0, 100) + '%" type="range" min="0" max="100" step="1" value="' + activeOpacity + '">' +
                  '<span class="shapeSliderValPill" data-shape-fill-opacity-label="1">' + sliderValueHtml(activeOpacity, '%') + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="shapeGhost shapeGhostCompact wizardDesignMoveHint">Sleep de actieve vorm in de preview om de plek te bepalen.</div>' +
        '</div>' +
      '</div>'
      ) : '') +
    '</div>' +
    '</div>' +
    '</section>'
  );
}

function renderBrandSwatchButtons(list, selectedColor, attrName) {
  return list.map(function(swatch){
    var color = String(swatch && swatch.a || '').trim();
    if (!color) return '';
    var selected = sameColorHex(selectedColor, color);
    var label = String(swatch && swatch.n || color).trim();
    var light = String(color || '').toLowerCase() === '#ffffff';
    return '<button class="brandSw' + (light ? ' brandSwLight' : '') + (selected ? ' sel' : '') + '" type="button" ' + attrName + '="' + esc(color) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '" style="background:' + esc(color) + '"></button>';
  }).join('');
}

function renderBrandPalettePicker(rows, selectedColor, attrName) {
  var safeRows = Array.isArray(rows) ? rows.filter(function(row){
    return Array.isArray(row) && row.length;
  }) : [];
  if (!safeRows.length) return '';
  return (
    '<div class="brandCompact brandCompact-shared wizardBrandCompact">' +
      safeRows.map(function(row){
        return '<div class="brandSwsGroup">' + renderBrandSwatchButtons(row, selectedColor, attrName) + '</div>';
      }).join('') +
    '</div>'
  );
}

function renderEditorPaletteHtml(key, rows, selectedColor, attrName, opts) {
  opts = opts || {};
  var safeRows = Array.isArray(rows) ? rows.filter(function(row){
    return Array.isArray(row) && row.length;
  }) : [];
  if (!safeRows.length) return '';
  var cur = String(selectedColor || '').toLowerCase();
  var hexNorm = normalizeHexInput(selectedColor) || '#ffffff';
  var firstRow = safeRows[0] || [];
  var quickItems = firstRow.slice(0, opts.quickLimit || 8);
  var extraRows = (firstRow.length > quickItems.length ? [firstRow.slice(quickItems.length)] : []).concat(safeRows.slice(1));
  var expanded = !!(state.paletteExpanded && state.paletteExpanded[key]);
  var gridIcon = '<svg viewBox="0 0 14 14" width="11" height="11" fill="currentColor" opacity=".75"><rect x="1.5" y="1.5" width="3" height="3" rx=".8"/><rect x="5.5" y="1.5" width="3" height="3" rx=".8"/><rect x="9.5" y="1.5" width="3" height="3" rx=".8"/><rect x="1.5" y="5.5" width="3" height="3" rx=".8"/><rect x="5.5" y="5.5" width="3" height="3" rx=".8"/><rect x="9.5" y="5.5" width="3" height="3" rx=".8"/><rect x="1.5" y="9.5" width="3" height="3" rx=".8"/><rect x="5.5" y="9.5" width="3" height="3" rx=".8"/><rect x="9.5" y="9.5" width="3" height="3" rx=".8"/></svg>';
  var swBtn = function(p){
    var hex = String(p && p.a || '').toLowerCase();
    var isLight = hex === '#ffffff' || hex === 'ffffff';
    return '<button class="brandSw' + (isLight ? ' brandSwLight' : '') + (cur === hex ? ' sel' : '') + '" type="button" ' + attrName + '="' + esc(p.a) + '" title="' + esc(p.n || p.a) + '" aria-label="' + esc(p.n || p.a) + '" style="background:' + esc(p.a) + '"></button>';
  };
  var html = '<div class="brandCompact brandCompact-shared wizardEditorPalette" data-wizard-palette="' + esc(key) + '">' +
    '<div class="brandQSection">' +
      '<div class="brandQuickRow">' +
        '<div class="brandSwsGroup">' + quickItems.map(swBtn).join('') + '</div>' +
        '<div class="brandQuickActions compact">' +
          '<button class="brandExpandBtn' + (expanded ? ' on' : '') + '" type="button" data-wizard-palette-expand="' + esc(key) + '" title="' + (expanded ? 'Minder' : 'Meer kleuren') + '">' + gridIcon + '</button>' +
          '<span class="brandQSep"></span>' +
          '<label class="brandCurrentSw" style="background:' + esc(hexNorm) + '" title="' + esc(opts.currentTitle || 'Eigen kleur kiezen') + '">' +
            '<input type="color" value="' + esc(hexNorm) + '" ' + (opts.inputAttr || '') + '>' +
          '</label>' +
        '</div>' +
      '</div>' +
    '</div>';
  if (expanded) {
    html += '<div class="brandExpandedWrap">';
    if (extraRows.length >= 3) {
      var families = [];
      for (var i = 0; i < Math.floor(extraRows.length / 3); i += 1) {
        var light = extraRows[i * 3] || [];
        var base = extraRows[i * 3 + 1] || [];
        var deep = extraRows[i * 3 + 2] || [];
        for (var j = 0; j < light.length; j += 1) {
          if (light[j]) families.push([light[j], base[j] || light[j], deep[j] || light[j]]);
        }
      }
      html += '<div class="brandWordBlocks">';
      ['Rustig & fris', 'Warm & zacht', 'Neutraal & donker'].forEach(function(label, index){
        var group = families.slice(index * 14, index * 14 + 14);
        if (!group.length) return;
        html += '<div class="brandWordSection"><div class="brandWordLabel">' + esc(label) + '</div><div class="brandWordBlock">';
        group.forEach(function(family){
          family.forEach(function(item){ html += swBtn(item); });
        });
        html += '</div></div>';
      });
      html += '</div>';
    } else {
      html += extraRows.map(function(row){
        return '<div class="brandSwsGroup">' + row.map(swBtn).join('') + '</div>';
      }).join('');
    }
    html += '<label class="brandCustomBtn" style="--pick:' + esc(hexNorm) + '"><span class="brandCustomSw"></span>Eigen kleur…<input type="color" value="' + esc(hexNorm) + '" ' + (opts.inputAttr || '') + '></label>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function sliderPercent(value, min, max) {
  var current = Number(value);
  var low = Number(min);
  var high = Number(max);
  if (!isFinite(current) || !isFinite(low) || !isFinite(high) || high <= low) return 0;
  return Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
}

function sliderValueHtml(value, suffix) {
  return '<span class="valueNum">' + esc(String(value == null ? '' : value)) + '</span><span class="valueSuffix">' + esc(suffix || '') + '</span>';
}

function ensureWizardBackgroundConfig() {
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  var current = state.wizardDraft.preview.indexBackground;
  var resolved = clonePlainData(resolveCardsIndexBackground({
    activeUi: {
      index: {
        background: current && typeof current === 'object' ? current : {}
      }
    }
  })) || {};
  state.wizardDraft.preview.indexBackground = Object.assign(resolved, current && typeof current === 'object' ? current : {});
  return state.wizardDraft.preview.indexBackground;
}

function wizardManualBackgroundPalette() {
  var palette = getSelectedPalette();
  var card = effectiveCardColor();
  var accent = getAccentColor();
  return [palette.previewA || accent, palette.previewB || mixHex(card, accent, 0.28), card]
    .map(function(color){ return String(color || '').trim(); })
    .filter(Boolean)
    .filter(function(color, index, list){
      return list.indexOf(color) === index;
    });
}

function syncWizardManualBackgroundPalette() {
  var bg = ensureWizardBackgroundConfig();
  bg.palette = wizardManualBackgroundPalette();
}

function syncDesignShapeLayersToPalette() {
  ensureDesignShapeLayers().forEach(function(layer, index){
    if (!layer || layer.colorMode === 'custom') return;
    layer.paletteRole = normalizeDesignShapePaletteRole(layer.paletteRole, index);
    layer.fill = '';
    if (layer.type === 'imported' && layer.importMarkup) {
      if (layer.importedHasFill !== false) layer.fill = '';
      if (layer.importedHasStroke) layer.stroke = '';
    }
  });
}

function isCustomPaletteId(value) {
  var current = String(value || '').trim().toLowerCase();
  return !current || current === CUSTOM_PALETTE_ID;
}

function buildCustomPaletteFromState() {
  var card = normalizeHexInput(state.wizardDraft.colors && state.wizardDraft.colors.cardColor) || '#FFFFFF';
  var accent = normalizeHexInput(state.wizardDraft.design && state.wizardDraft.design.accentColor) || '#2F5F63';
  var text = normalizeHexInput(state.wizardDraft.typography && state.wizardDraft.typography.textColor) || '#3C4650';
  var soft = mixHex('#BFE5E1', card, 0.46);
  var panel = mixHex('#DCE7EE', card, 0.38);
  var previewA = mixHex(accent, card, 0.64);
  var previewB = mixHex('#BFD5F0', card, 0.42);
  var iconAccent = mixHex('#6A63C2', accent, 0.22);
  return {
    id: CUSTOM_PALETTE_ID,
    label: 'Zelf kiezen',
    description: 'Geen vaste sfeer. Kies alles handmatig.',
    baseCard: card,
    basePanel: panel,
    softShape: soft,
    previewA: previewA,
    previewB: previewB,
    defaultAccent: accent,
    defaultIconAccent: iconAccent,
    defaultText: text
  };
}

function uniqueMoodColors(colors) {
  var seen = Object.create(null);
  return (Array.isArray(colors) ? colors : []).map(function(color){
    return String(color || '').trim();
  }).filter(function(color){
    var key = color.toLowerCase();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function paletteMoodSwatches(palette) {
  if (!palette || palette.id === CUSTOM_PALETTE_ID) return [];
  return uniqueMoodColors([
    palette.baseCard,
    palette.previewA,
    palette.defaultIconAccent || palette.previewB || palette.softShape,
    palette.defaultAccent,
    palette.basePanel || palette.softShape
  ]).slice(0, 4);
}

function renderMoodSwatchesMarkup(palette) {
  if (!palette || palette.id === CUSTOM_PALETTE_ID) {
    return [0, 1, 2, 3].map(function(index){
      return '<span class="wizardMoodSwatch is-empty' + (index === 0 ? ' is-card' : '') + '"></span>';
    }).join('');
  }
  return paletteMoodSwatches(palette).map(function(color, index){
    var cls = 'wizardMoodSwatch';
    if (index === 0) cls += ' is-card';
    if (index === 3) cls += ' is-accent';
    return '<span class="' + cls + '" style="background:' + esc(color) + '"></span>';
  }).join('');
}

function renderDesignMoodDropdownMarkup() {
  var selectedPalette = getSelectedPalette();
  var isCustom = selectedPalette.id === CUSTOM_PALETTE_ID;
  return (
    '<div class="wizardMoodMenuWrap" aria-label="Kies een sfeer">' +
      '<div class="wizardMoodSelectTitle">Sfeer</div>' +
      '<details class="wizardMoodMenu">' +
        '<summary class="wizardMoodMenuSummary" aria-label="Kies een sfeer" title="' + esc(selectedPalette.label + ' — ' + selectedPalette.description) + '">' +
          '<span class="wizardMoodSwatches wizardMoodSwatches--summary" aria-hidden="true">' +
            renderMoodSwatchesMarkup(selectedPalette) +
          '</span>' +
          '<span class="wizardMoodMeta wizardMoodMeta--summary">' +
            '<strong>' + esc(selectedPalette.label) + '</strong>' +
          '</span>' +
          '<span class="wizardMoodMenuChevron" aria-hidden="true">' + iconMarkup('chevron-down') + '</span>' +
        '</summary>' +
        '<div class="wizardMoodMenuPop">' +
          '<button class="wizardMoodMenuItem wizardMoodMenuItem--custom' + (isCustom ? ' is-selected' : '') + '" type="button" data-palette-choice="' + CUSTOM_PALETTE_ID + '">' +
            '<span class="wizardMoodSwatches wizardMoodSwatches--menu" aria-hidden="true">' +
              renderMoodSwatchesMarkup(buildCustomPaletteFromState()) +
            '</span>' +
            '<span class="wizardMoodMeta">' +
              '<strong>Zelf kiezen</strong>' +
              '<span>Geen vaste sfeer. Kies alles handmatig.</span>' +
            '</span>' +
          '</button>' +
          PALETTE_PRESETS.map(function(palette){
            var selected = palette.id === state.wizardDraft.palette;
            return (
              '<button class="wizardMoodMenuItem' + (selected ? ' is-selected' : '') + '" type="button" data-palette-choice="' + esc(palette.id) + '">' +
                '<span class="wizardMoodSwatches wizardMoodSwatches--menu" aria-hidden="true">' +
                  renderMoodSwatchesMarkup(palette) +
                '</span>' +
                '<span class="wizardMoodMeta">' +
                  '<strong>' + esc(palette.label) + '</strong>' +
                  '<span>' + esc(palette.description) + '</span>' +
                '</span>' +
              '</button>'
            );
          }).join('') +
        '</div>' +
      '</details>' +
      '<div class="wizardHint wizardMoodHint">Kies een sfeer of laat hem leeg en stel alles zelf samen.</div>' +
    '</div>'
  );
}

function renderDesignColorsPanel() {
  var cardTone = effectiveCardTone();
  return (
    renderEditorMiniCard('Kaartkleur',
      '<div class="stijlEditorSection">' +
        renderDesignMoodDropdownMarkup() +
        '<div class="wizardColorSectionDivider" aria-hidden="true"></div>' +
        '<div class="stijlColorStack">' +
          '<div class="stijlColorLine">' +
            renderEditorPaletteHtml('cardColor', STANDARD_BACKGROUND_ROWS, effectiveCardColor(), 'data-card-color', {
              inputAttr: 'data-card-color-input',
              currentTitle: 'Eigen kaartkleur kiezen'
            }) +
          '</div>' +
          '<div class="shapeSliderRow" style="margin-top:6px">' +
            '<div class="shapeSliderHRow">' +
              '<span class="shapeSliderHLbl">Kleurtoon</span>' +
              '<input class="shapeSlider" data-card-tone="1" style="flex:1;--pct:' + sliderPercent(cardTone, -100, 100) + '%" type="range" min="-100" max="100" step="1" value="' + cardTone + '">' +
              '<span class="shapeSliderValPill" data-card-tone-label="1">' + sliderValueHtml((cardTone > 0 ? '+' : '') + cardTone, '') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>',
      {
        className: 'wizardEditorMiniCard wizardEditorMiniCard--color',
        tight: false,
        tip: 'kleur',
        panel: 'colors'
      }
    )
  );
}

function renderDesignBackgroundPanel() {
  var bg = ensureWizardBackgroundConfig();
  var autoMode = bg.autoMode !== false;
  var count = typeof bg.blobCount === 'number' ? Math.max(2, Math.min(22, Math.round(bg.blobCount))) : 7;
  var size = typeof bg.sizeScale === 'number' ? Math.max(0.3, Math.min(2.4, bg.sizeScale)) : 0.85;
  var alpha = typeof bg.alphaBoost === 'number' ? Math.max(0.4, Math.min(3.2, bg.alphaBoost)) : 1.05;
  return renderEditorMiniCard('Achtergrond',
    '<div class="bgCanvasFlat wizardEditorBgFlat">' +
      '<div class="bgAutoHint" style="margin:0 0 9px">' + (autoMode ? 'Volgt vormen en kleuren van de hele set.' : 'Kies zelf vormen, kleuren en intensiteit.') + '</div>' +
      '<div class="togR2" style="margin-top:4px;margin-bottom:6px"><label style="font-size:12px;color:var(--k2)">Automatisch</label><label class="tog"><input id="wizardBgAuto" type="checkbox" data-bg-auto="1"' + (autoMode ? ' checked' : '') + '><span class="togSl"></span></label></div>' +
      '<div class="bgCanvasFlatSec">' +
        '<div class="sLbl">Intensiteit</div>' +
        '<div class="ctrlR"><label>Aantal</label><input class="shapeSlider" data-bg-count="1" style="--pct:' + sliderPercent(count, 2, 22) + '%" type="range" min="2" max="22" step="1" value="' + count + '"><span class="cv" data-bg-count-label="1">' + sliderValueHtml(count, '') + '</span></div>' +
        '<div class="ctrlR"><label>Grootte</label><input class="shapeSlider" data-bg-size="1" style="--pct:' + sliderPercent(size, 0.3, 2.4) + '%" type="range" min="0.3" max="2.4" step="0.1" value="' + size + '"><span class="cv" data-bg-size-label="1">' + sliderValueHtml(size, '×') + '</span></div>' +
        '<div class="ctrlR"><label>Zichtbaarheid</label><input class="shapeSlider" data-bg-alpha="1" style="--pct:' + sliderPercent(alpha, 0.2, 3.2) + '%" type="range" min="0.2" max="3.2" step="0.1" value="' + alpha + '"><span class="cv" data-bg-alpha-label="1">' + sliderValueHtml(alpha, '×') + '</span></div>' +
        '<div class="bgAutoHint" style="margin:4px 0 0">Bepaal de zichtbaarheid van de achtergrond.</div>' +
      '</div>' +
    '</div>',
    {
      className: 'wizardEditorMiniCard wizardEditorMiniCard--background',
      tight: true,
      tip: 'achtergrond',
      panel: 'background'
    }
  );
}

function renderDesignTypographyPanel() {
  var titlePt = panelTitlePointValue();
  var bodyPt = panelBodyPointValue();
  return renderEditorMiniCard('Tekst',
    '<div class="wizardTextToolbarBlock" aria-label="Tekst instellingen">' +
      '<div class="wizardTextToolbarHead">' +
        '<div class="wizardTextToolbarMetaLabel">Toepassen op</div>' +
        '<div class="wizardTextToolbarContext">' +
          renderTypographyTargetButton('cards', 'Kaarten') +
          renderTypographyTargetButton('cover', 'Cover') +
        '</div>' +
      '</div>' +
      '<div class="wizardTextToolbarLine">' +
        '<div class="wizardTextToolbarLineLabel">Titel</div>' +
        '<div class="wizardTextToolbarLineControls">' +
          renderTypographyFontMenuBlock('title', panelTitleFontValue(), 'Titel lettertype') +
          renderTypographyPointSizeMenuBlock('title', titlePt, TYPOGRAPHY_TITLE_PT_OPTIONS, 'Titelgrootte') +
        '</div>' +
      '</div>' +
      '<div class="wizardTextToolbarLine">' +
        '<div class="wizardTextToolbarLineLabel">Tekst</div>' +
        '<div class="wizardTextToolbarLineControls">' +
          renderTypographyFontMenuBlock('body', panelBodyFontValue(), 'Tekst lettertype') +
          renderTypographyPointSizeMenuBlock('body', bodyPt, TYPOGRAPHY_BODY_PT_OPTIONS, 'Tekstgrootte') +
        '</div>' +
      '</div>' +
      '<div class="wizardTextToolbarDivider" aria-hidden="true"></div>' +
      '<div class="wizardTextToolbarControlStrip">' +
        renderTextStyleButtons() +
        renderTextColorQuickRow() +
        renderTextAlignButtons() +
      '</div>' +
    '</div>',
    {
      className: 'wizardEditorMiniCard wizardEditorMiniCard--typography',
      tight: false,
      tip: 'typografie',
      panel: 'type'
    }
  );
}

function renderTypographyStep() {
  var preset = getTypographyPreset();
  var titleFont = effectiveTitleFont();
  var bodyFont = effectiveBodyFont();
  var titlePt = String(effectiveTitlePt());
  var bodyPt = String(effectiveBodyPt());
  return (
    '<h1 class="wizardTitle">Kies je tekststijl</h1>' +
    '<p class="wizardLead">Gebruik de tekstbalk bovenaan voor sfeer en lettertypes. Hier regel je de groottes fijn.</p>' +
    '<div class="wizardTypographyGrid">' +
      '<div class="wizardControlCard wizardTypographyIntroCard">' +
        '<div class="wizardTypographyContextNote">' +
          '<div class="wizardMiniTitle">Actief</div>' +
          '<div class="wizardTypographyContextPill">' + (normalizeTypographyTarget(state.typographyTarget) === 'cards' ? 'Thema kaarten' : 'Cover') + '</div>' +
        '</div>' +
        '<div class="wizardTypographyPreviewCard">' +
          '<div class="wizardTypographyPreviewTitle" style="font-family:\'' + esc(titleFont) + '\',serif;font-size:' + esc(titlePt) + 'pt">Diep luisteren begint met aandacht</div>' +
          '<div class="wizardTypographyPreviewBody" style="font-family:\'' + esc(bodyFont) + '\',sans-serif;font-size:' + esc(bodyPt) + 'pt">Deze sfeer voelt ' + esc(preset.note.toLowerCase()) + ' en blijft later gewoon verder aanpasbaar in de editor.</div>' +
        '</div>' +
        '<div class="wizardHint">De tekstkleur komt uit de vorige stap; tekst bepaalt hier vooral ritme, lettertype en formaat.</div>' +
      '</div>' +
      '<div class="wizardControlCard wizardTypographyEditorCard">' +
        '<div class="wizardTypographySizeGrid">' +
          '<div>' +
            '<div class="wizardMiniTitle">Titelgrootte</div>' +
            '<div class="sizePills" style="margin-top:10px">' +
              TYPOGRAPHY_TITLE_PT_OPTIONS.map(function(size){
                var selected = size === titlePt;
                return '<button class="sizePill' + (selected ? ' sel' : '') + '" type="button" data-title-pt="' + size + '">' + esc(size + ' pt') + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="wizardMiniTitle">Tekstgrootte</div>' +
            '<div class="sizePills" style="margin-top:10px">' +
              TYPOGRAPHY_BODY_PT_OPTIONS.map(function(size){
                var selected = size === bodyPt;
                return '<button class="sizePill' + (selected ? ' sel' : '') + '" type="button" data-body-pt="' + size + '">' + esc(size + ' pt') + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderQuestionsStep() {
  var activeTheme = getActiveTheme();
  var activeQuestionText = activeTheme ? (state.wizardDraft.questions[activeTheme.id] || '') : '';
  return (
    '<h1 class="wizardTitle">Welke vragen komen op je kaarten?</h1>' +
    '<p class="wizardLead">Schrijf per thema &eacute;&eacute;n vraag per regel. Rechts zie je meteen hoe je gekozen vormgeving uitpakt op een echte kaart.</p>' +
    '<div class="wizardThemeBar">' +
      state.wizardDraft.themes.map(function(theme, index){
        var selected = theme.id === state.activeThemeId;
        return (
          '<button class="wizardThemeChip' + (selected ? ' is-selected' : '') + '" type="button" data-theme-select="' + theme.id + '">' +
            '<span class="wizardThemeChipDot"></span>' +
            '<span>' + esc(theme.name || ('Thema ' + (index + 1))) + '</span>' +
          '</button>'
        );
      }).join('') +
    '</div>' +
    '<div class="wizardThemeEditor">' +
      '<div class="wizardField">' +
        '<label for="questionsInput">Vragen voor ' + esc(activeTheme ? activeTheme.name : 'dit thema') + '</label>' +
        '<textarea id="questionsInput" class="wizardTextarea" placeholder="Wanneer voel jij verbinding in ons team?&#10;Wat maakt samenwerken prettig?&#10;Wat blijft vaak onuitgesproken?&#10;Wat helpt om samen verder te komen?">' + esc(activeQuestionText) + '</textarea>' +
      '</div>' +
      '<div class="wizardActionsRow">' +
        '<button class="wizardGhostBtn" type="button" data-fill-sample="1">Voorbeeldvragen</button>' +
        '<button class="wizardGhostBtn" type="button" data-help-placeholder="1" disabled>Hulp nodig?</button>' +
        '<span class="wizardMuted">' + countAllQuestions() + ' kaarten in totaal</span>' +
      '</div>' +
      '<div class="wizardHint">Voorbeeld met achterkant: <strong>Wat maakt jouw dag goed? | Denk aan een klein moment van vandaag.</strong></div>' +
    '</div>'
  );
}

function renderCoverStep() {
  var info = state.wizardDraft.infoPage;
  var coverTexts = buildCoverTexts(getTypographyPreset(), getSelectedPalette());
  var titleText = coverTexts[0] && coverTexts[0].text ? coverTexts[0].text : (state.wizardDraft.name.trim() || 'Jouw kaartenset');
  var subtitleText = coverTexts[1] && coverTexts[1].text ? coverTexts[1].text : '';
  return (
    '<h1 class="wizardTitle">Maak je cover en infosheet af</h1>' +
    '<p class="wizardLead">Nu de inhoud en stijl staan, kun je de presentatie afronden. De cover rechts werkt meteen mee terwijl je hieronder de tekst bijstuurt.</p>' +
    '<section class="wizardSection">' +
      '<div class="wizardMiniTitle">Tekst op de cover</div>' +
      '<div class="wizardInlineFields">' +
        '<div class="wizardField"><label for="coverTitleInput">Titel op de cover</label><input id="coverTitleInput" class="wizardInput" type="text" value="' + esc(titleText) + '" placeholder="bijv. Diep Luisteren"></div>' +
        '<div class="wizardField"><label for="coverSubtitleInput">Korte ondertitel</label><input id="coverSubtitleInput" class="wizardInput" type="text" value="' + esc(subtitleText) + '" placeholder="bijv. gesprekskaarten"></div>' +
      '</div>' +
      '<div class="wizardHint">De opmaak van de cover komt uit de vorige stappen. Positie en detailwerk kun je later nog verder verfijnen in de editor.</div>' +
    '</section>' +
    '<section class="wizardSection">' +
      '<div class="wizardMiniTitle">Wil je een infosheet toevoegen?</div>' +
      '<div class="wizardOptionList">' +
        renderInfoModeCard(false, 'Alleen kaarten', 'De wizard maakt alleen de kaarten aan. Je kunt later nog een infosheet toevoegen.') +
        renderInfoModeCard(true, 'Voeg uitlegpagina toe', 'Maak alvast een eerste versie van je uitleg mee aan.') +
      '</div>' +
      (info.enabled ? (
        '<div class="wizardInlineFields">' +
          '<div class="wizardField"><label for="infoTitleInput">Titel</label><input id="infoTitleInput" class="wizardInput" type="text" value="' + esc(info.title) + '" placeholder="Over deze kaartenset"></div>' +
          '<div class="wizardField"><label for="infoIntroInput">Korte introductie</label><textarea id="infoIntroInput" class="wizardTextarea" style="min-height:160px">' + esc(info.intro) + '</textarea></div>' +
          '<div class="wizardField" style="grid-column:1 / -1"><label for="infoUsageInput">Hoe gebruik je deze kaarten?</label><textarea id="infoUsageInput" class="wizardTextarea" style="min-height:160px">' + esc(info.usage) + '</textarea></div>' +
        '</div>'
      ) : '') +
    '</section>'
  );
}

function renderPublicationStep() {
  return (
    '<h1 class="wizardTitle">Hoe wil je publiceren?</h1>' +
    '<p class="wizardLead">Kies pas nu wie je kaartenset mag zien. Deze instelling blijft later gewoon aanpasbaar.</p>' +
    '<section class="wizardSection">' +
      '<div class="wizardMiniTitle">Wie mag je kaartenset zien?</div>' +
      '<div class="wizardOptionList">' +
        renderVisibilityCard('private', 'Priv&eacute;', 'Alleen jij ziet deze set in je dashboard.') +
        renderVisibilityCard('unlisted', 'Met link delen', 'Handig als je de set wilt bekijken of delen zonder hem breed te publiceren.') +
        renderVisibilityCard('public', 'Openbaar publiceren', 'Zet de set klaar om zichtbaar te maken voor anderen.') +
      '</div>' +
      '<div class="wizardHint" style="margin-top:16px">De cover en eventuele infosheet staan al klaar uit de vorige stap; hier kies je alleen nog hoe de set gedeeld wordt.</div>' +
    '</section>'
  );
}

function renderDoneStep() {
  var summary = buildSummaryData();
  var editHref = dashboardSetHref('edit');
  var viewHref = dashboardSetHref('view');
  var isEditing = !!state.editingSet;
  var linkAttrs = embeddedLinkAttrs();
  return (
    '<div class="wizardSummary">' +
      '<div class="wizardSummaryHead">' +
        '<h1 class="wizardTitle">' + (isEditing ? 'Je kaartenset is bijgewerkt &#10024;' : 'Je kaartenset is klaar &#10024;') + '</h1>' +
        '<p class="wizardLead">' + (isEditing
          ? 'De bijgewerkte versie staat nu weer in je bestaande omgeving. Je kunt meteen kijken hoe hij aanvoelt, of verder finetunen in de editor.'
          : 'De eerste versie staat nu in je bestaande omgeving. Je kunt meteen bekijken hoe hij aanvoelt, of verder finetunen in de editor.') + '</p>' +
        '<div class="wizardSummaryStats">' +
          '<span class="wizardOptionBadge">' + summary.themeCount + ' thema' + (summary.themeCount === 1 ? '' : '\'s') + '</span>' +
          '<span class="wizardOptionBadge">' + summary.cardCount + ' kaart' + (summary.cardCount === 1 ? '' : 'en') + '</span>' +
          '<span class="wizardOptionBadge">' + esc(summary.paletteLabel) + '</span>' +
          '<span class="wizardOptionBadge">' + esc(summary.formatLabel) + '</span>' +
          '<span class="wizardOptionBadge">Infosheet: ' + (summary.hasInfoPage ? 'ja' : 'nee') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="wizardSummaryGrid">' +
        summary.cardsHtml +
      '</div>' +
      '<div class="wizardSummaryActions">' +
        '<a class="wizardPrimaryBtn" href="' + esc(viewHref) + '"' + linkAttrs + '>Bekijk je kaartenset</a>' +
        '<a class="wizardSecondaryBtn" href="' + esc(editHref) + '"' + linkAttrs + '>Verder finetunen</a>' +
      '</div>' +
      '<div class="wizardMuted">Alles blijft later gewoon aanpasbaar in de editor.</div>' +
    '</div>'
  );
}

function renderVisibilityCard(value, title, body) {
  var selected = state.wizardDraft.visibility === value;
  return (
    '<button class="wizardOptionCard' + (selected ? ' is-selected' : '') + '" type="button" data-visibility-choice="' + value + '">' +
      '<span class="wizardChoiceCardCheck">' + iconMarkup('check') + '</span>' +
      '<strong>' + title + '</strong>' +
      '<span>' + body + '</span>' +
    '</button>'
  );
}

function renderInfoModeCard(enabled, title, body) {
  var selected = !!state.wizardDraft.infoPage.enabled === enabled;
  return (
    '<button class="wizardOptionCard' + (selected ? ' is-selected' : '') + '" type="button" data-info-choice="' + (enabled ? '1' : '0') + '">' +
      '<span class="wizardChoiceCardCheck">' + iconMarkup('check') + '</span>' +
      '<strong>' + title + '</strong>' +
      '<span>' + body + '</span>' +
    '</button>'
  );
}

function renderPreviewPanel() {
  var preview = buildPreviewState();
  var metrics = previewWindowMetrics();
  var nightMode = previewNightEnabled();
  var gridMode = previewGridEnabled();
  var isShapeEditing = wizardShapeEditingEnabled();
  var sharedPreviewShell = getWizardSharedPreviewShell();
  if (!sharedPreviewShell) {
    return (
      '<aside class="wizardPreviewPanel" id="wizardPreviewViewport" aria-label="Live preview">' +
        '<div class="wizardMuted">Preview niet beschikbaar.</div>' +
      '</aside>'
    );
  }
  var previewWindowClassName = 'stijlCanvasWindow' +
    (isShapeEditing ? ' is-shape-editing' : '') +
    (nightMode ? ' night' : '') +
    (gridMode ? ' grid-on' : '');
  var previewShellHtml = sharedPreviewShell.renderCanvasPreviewShell({
    columnClassName: 'stijlPreviewCol stijlCanvasCenter',
    stageClassName: 'stijlCanvasStage',
    stageStyle: metrics.stageStyle,
    cardWrapClassName: 'stijlCanvasCardWrap',
    windowClassName: previewWindowClassName,
    windowAttrText: ' data-wizard-preview="1"',
    windowStyle: metrics.shellStyle,
    topbarHtml: renderPreviewControls(preview),
    bgWrapId: 'wizardPreviewBgWrap',
    bgCanvasId: 'wizardPreviewBgCanvas',
    previewCoreHtml: preview.html,
    backbarHtml: renderPreviewBackbar()
  });
  return (
    '<aside class="wizardPreviewPanel" id="wizardPreviewViewport" aria-label="Live preview">' +
      '<div class="stijlCardLayout canvas wizardPreviewLayout">' +
        '<div class="stijlCanvasSide preview home-static-preview">' +
          previewShellHtml +
        '</div>' +
      '</div>' +
    '</aside>'
  );
}

function renderPreviewControls(preview) {
  var sharedPreviewShell = getWizardSharedPreviewShell();
  if (!sharedPreviewShell) return '';
  var nightMode = previewNightEnabled();
  var gridMode = previewGridEnabled();
  var doubleSided = previewDoubleSided();
  var navLabel = preview && preview.navLabel ? preview.navLabel : 'Cover';
  return sharedPreviewShell.buildTopbarHtml({
    zoom: {
      zoomPct: state.previewZoom || PREVIEW_DEFAULT_ZOOM,
      resetTitle: 'Telefoon-formaat (' + PREVIEW_DEFAULT_ZOOM + '%)',
      zoomOutAttrText: ' onclick="window.PK.wizardPreview.stepZoom(-' + PREVIEW_ZOOM_STEP + ');return false;"',
      resetAttrText: ' onclick="window.PK.wizardPreview.resetZoom();return false;"',
      zoomInAttrText: ' onclick="window.PK.wizardPreview.stepZoom(' + PREVIEW_ZOOM_STEP + ');return false;"'
    },
    nav: {
      backAttrText: ' onclick="window.PK.wizardPreview.navigate(-1);return false;"',
      centerLabel: navLabel,
      centerTitle: 'Ga naar cover',
      centerAttrText: ' onclick="window.PK.wizardPreview.navigateHome();return false;"',
      forwardAttrText: ' onclick="window.PK.wizardPreview.navigate(1);return false;"'
    },
    actions: {
      showFlip: doubleSided,
      flipSelected: !!state.previewFlipped,
      flipAttrText: ' data-preview-flip="1" onclick="window.PK.wizardPreview.toggleFlip();return false;"',
      showGrid: true,
      gridSelected: gridMode,
      gridAttrText: ' data-preview-grid-toggle="1" onclick="window.PK.wizardPreview.toggleGrid();return false;"',
      showNight: true,
      nightSelected: nightMode,
      nightAttrText: ' data-preview-night-toggle="1" onclick="window.PK.wizardPreview.toggleNight();return false;"'
    }
  });
}

function renderFooter() {
  if (state.stepIndex === STEP_DEFS.length - 1) return '';
  return (
    '<div class="wizardFooter">' +
      '<div class="wizardFooterInner">' +
        '<div class="wizardFooterNote">' + footerNoteText() + '</div>' +
        renderNavButtons('wizardFooterActions') +
      '</div>' +
    '</div>'
  );
}

function wizardPreviewNavState() {
  var stepId = currentStepId();
  var allowCover = stepAllowsCoverPreview(stepId);
  var themes = Array.isArray(state.wizardDraft.themes) ? state.wizardDraft.themes : [];
  var items = themes.map(function(theme, index){
    return {
      target: 'theme',
      themeId: theme.id,
      label: theme.name || ('Thema ' + (index + 1))
    };
  });
  if (allowCover) {
    items.unshift({
      target: 'cover',
      themeId: '',
      label: 'Cover'
    });
  }
  if (!items.length) {
    items.push({
      target: 'cover',
      themeId: '',
      label: 'Cover'
    });
  }
  var currentTarget = allowCover
    ? normalizePreviewTarget(state.previewTarget)
    : 'theme';
  var index = items.findIndex(function(item){
    if (item.target !== currentTarget) return false;
    if (item.target !== 'theme') return true;
    return item.themeId === state.activeThemeId;
  });
  if (index < 0) index = 0;
  return {
    allowCover: allowCover,
    items: items,
    index: index,
    current: items[index] || items[0],
    hasPrev: index > 0,
    hasNext: index < items.length - 1
  };
}

function navigateWizardPreview(delta) {
  var navState = wizardPreviewNavState();
  var nextIndex = navState.index + (Number(delta) || 0);
  if (nextIndex < 0 || nextIndex >= navState.items.length) return;
  var next = navState.items[nextIndex];
  if (!next) return;
  setPreviewTarget(next.target, next.themeId || '');
  commitWizardChange(false);
}

function navigateWizardPreviewHome() {
  var navState = wizardPreviewNavState();
  if (!navState.allowCover || !navState.current || navState.current.target === 'cover') return;
  setPreviewTarget('cover', '');
  commitWizardChange(false);
}

function navPrimaryLabel() {
  var onLastInputStep = state.stepIndex === STEP_DEFS.length - 2;
  var saveLabel = state.editingSet ? 'Bijwerken' : 'Aanmaken';
  return onLastInputStep ? (state.saving ? (saveLabel + '...') : saveLabel) : 'Volgende';
}

function renderNavButtons(className) {
  var nextLabel = navPrimaryLabel();
  return (
    '<div class="' + className + '">' +
      '<button class="wizardBackBtn" type="button" data-nav="back"' + (state.stepIndex === 0 || state.saving ? ' disabled' : '') + '>Terug</button>' +
      '<button class="wizardNextBtn" type="button" data-nav="next"' + (isNextDisabled() ? ' disabled' : '') + '>' +
        (state.saving ? '<span class="wizardSpinner" aria-hidden="true"></span>' : '') +
        '<span>' + nextLabel + '</span>' +
      '</button>' +
    '</div>'
  );
}

function footerNoteText() {
  var stepId = currentStepId();
  if (stepId === 'name') return 'Geef eerst je set een duidelijke naam en link.';
  if (stepId === 'themes') return 'Leg nu eerst de inhoudelijke structuur vast; de vragen volgen hier direct op.';
  if (stepId === 'design') {
    var substepId = getDesignSubstep().id;
    if (substepId === 'shapes') return 'Kies hier rustig de bouwstenen; kleuren en achtergrond volgen binnen dezelfde ontwerpstap.';
    if (substepId === 'colors') return 'Alle kleurkeuzes op dit scherm werken meteen door in de preview.';
    if (substepId === 'type') return 'Werk hier de lettertypes en groottes uit, zodat je vragen straks meteen in de juiste stijl verschijnen.';
    return 'De achtergrondstructuur verandert meteen mee, zonder dat je vormen of kleuren kwijtraakt.';
  }
  if (stepId === 'questions') return 'E&eacute;n vraag per regel is genoeg om te starten; je kaartpreview rechts werkt direct mee.';
  if (stepId === 'cover') return 'De cover mag nu aansluiten op wat je al hebt opgebouwd; een infosheet is optioneel.';
  if (stepId === 'publish') return state.editingSet
    ? 'Bij opslaan werken we je bestaande set meteen bij in je ruimte.'
    : 'Pas in deze stap zetten we je opzet om naar een echte set in je ruimte.';
  return 'De volledige editor blijft later beschikbaar voor detailwerk.';
}

function wireEvents() {
  root.querySelectorAll('[data-toggle-sidebar]').forEach(function(button){
    button.addEventListener('click', function(){
      state.sidebarCollapsed = !state.sidebarCollapsed;
      writeSidebarCollapsedPreference(state.sidebarCollapsed);
      renderApp(true);
    });
  });

  root.querySelectorAll('[data-jump-step]').forEach(function(button){
    button.addEventListener('click', function(){
      var nextIndex = parseInt(button.getAttribute('data-jump-step') || '0', 10);
      if (!canJumpToStep(nextIndex)) return;
      setStepIndex(nextIndex);
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-design-substep]').forEach(function(button){
    button.addEventListener('click', function(){
      var nextId = button.getAttribute('data-design-substep') || DESIGN_SUBSTEPS[0].id;
      setDesignSubstep(nextId);
      commitWizardChange(false);
      if (isEmbeddedMode() && currentStepId() === 'design') {
        requestAnimationFrame(function(){
          scrollEmbeddedDesignSection(nextId, 'smooth');
        });
      }
    });
  });

  root.querySelectorAll('[data-wizard-panel-toggle]').forEach(function(button){
    button.addEventListener('click', function(){
      var panel = button.getAttribute('data-wizard-panel-toggle') || '';
      if (!panel) return;
      state.designPanelOpen = state.designPanelOpen || {};
      state.designPanelOpen[panel] = !isDesignPanelOpen(panel);
      renderApp(false);
    });
  });

  root.querySelectorAll('[data-preview-target]').forEach(function(button){
    button.addEventListener('click', function(){
      setPreviewTarget(button.getAttribute('data-preview-target'), button.getAttribute('data-preview-theme-id'));
      commitWizardChange(false);
    });
  });

  wireWizardShapeEditing();

  bindInput('setNameInput', function(value){
    state.wizardDraft.name = value;
    if (!state.slugCustom) state.wizardDraft.slug = slugify(value);
    commitWizardChange(true);
  });

  bindInput('slugInput', function(value){
    state.slugCustom = true;
    state.wizardDraft.slug = slugify(value);
    commitWizardChange(true);
  });

  var slugToggle = root.querySelector('[data-toggle-slug]');
  if (slugToggle) {
    slugToggle.addEventListener('click', function(){
      state.slugEditorOpen = !state.slugEditorOpen;
      if (!state.slugEditorOpen && !state.slugCustom) state.wizardDraft.slug = slugify(state.wizardDraft.name);
      commitWizardChange(false);
    });
  }

  root.querySelectorAll('[data-theme-mode]').forEach(function(button){
    button.addEventListener('click', function(){
      setThemeMode(button.getAttribute('data-theme-mode'));
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-format-choice]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.format = button.getAttribute('data-format-choice') || state.wizardDraft.format;
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-palette-choice]').forEach(function(button){
    button.addEventListener('click', function(){
      var paletteId = button.getAttribute('data-palette-choice') || state.wizardDraft.palette;
      applyPaletteChoice(paletteId);
      var menu = button.closest('.wizardMoodMenu');
      if (menu) menu.removeAttribute('open');
      commitWizardChange(false);
    });
  });

  var paletteSelect = document.getElementById('paletteSelect');
  if (paletteSelect) {
    paletteSelect.addEventListener('change', function(){
      applyPaletteChoice(paletteSelect.value || state.wizardDraft.palette);
      commitWizardChange(false);
    });
  }

  root.querySelectorAll('[data-shape-choice]').forEach(function(button){
    button.addEventListener('click', function(){
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      state.designSelectionTouched = true;
      activeLayer.type = button.getAttribute('data-shape-choice') || activeLayer.type;
      delete activeLayer.label;
      delete activeLayer.importMarkup;
      delete activeLayer.importedHasFill;
      delete activeLayer.importedHasStroke;
      delete activeLayer.stroke;
      delete activeLayer.strokeOpacity;
      delete activeLayer.strokeWidth;
      syncLegacyShapeFields();
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-shape-svg-import]').forEach(function(input){
    input.addEventListener('change', function(){
      importWizardShapeSvgFile(input);
    });
  });

  root.querySelectorAll('[data-shape-layer-select]').forEach(function(button){
    button.addEventListener('click', function(){
      setActiveDesignShapeLayer(button.getAttribute('data-shape-layer-select') || '');
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-shape-layer-add]').forEach(function(button){
    button.addEventListener('click', function(){
      var layers = ensureDesignShapeLayers();
      if (layers.length >= 6) return;
      state.designSelectionTouched = true;
      var template = getActiveDesignShapeLayer() || currentDesignShapeState();
      var nextLayer = defaultDesignShapeLayer({
        type: template.type || 'blob',
        x: clamp(Number(template.x) + 8, -25, 125),
        y: clamp(Number(template.y) + 8, -25, 125),
        size: clamp(Number(template.size), 12, 120),
        rotate: clamp(Number(template.rotate), -180, 180),
        colorMode: template.colorMode === 'custom' ? 'custom' : 'palette',
        paletteRole: template.colorMode === 'custom'
          ? normalizeDesignShapePaletteRole(template.paletteRole, layers.length)
          : defaultDesignShapePaletteRole(layers.length),
        fill: String(template.fill || '').trim(),
        fillOpacity: Math.max(0, Math.min(1, Number(template.fillOpacity) || 0.92))
      });
      layers.push(nextLayer);
      state.wizardDraft.design.activeShapeLayerId = nextLayer.id;
      syncLegacyShapeFields();
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-shape-layer-remove]').forEach(function(button){
    button.addEventListener('click', function(){
      var layers = ensureDesignShapeLayers();
      if (layers.length <= 1) return;
      state.designSelectionTouched = true;
      var activeLayer = getActiveDesignShapeLayer();
      var removeIndex = layers.findIndex(function(layer){ return activeLayer && layer.id === activeLayer.id; });
      if (removeIndex < 0) removeIndex = layers.length - 1;
      layers.splice(removeIndex, 1);
      state.wizardDraft.design.activeShapeLayerId = (layers[Math.max(0, removeIndex - 1)] || layers[0]).id;
      syncLegacyShapeFields();
      commitWizardChange(false);
    });
  });

  var shapeSizeInput = root.querySelector('[data-shape-size]');
  if (shapeSizeInput) {
    var shapeSizeLabel = root.querySelector('[data-shape-size-label]');
    function syncShapeSize(input) {
      var value = clamp(Number(input.value), 12, 120);
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      activeLayer.size = value;
      syncLegacyShapeFields();
      input.style.setProperty('--pct', sliderPercent(value, 12, 120) + '%');
      if (shapeSizeLabel) shapeSizeLabel.innerHTML = sliderValueHtml(value, '');
      syncWizardPrimaryShapeDom();
    }
    shapeSizeInput.addEventListener('input', function(){
      syncShapeSize(shapeSizeInput);
    });
    shapeSizeInput.addEventListener('change', function(){
      syncShapeSize(shapeSizeInput);
      commitWizardChange(false);
    });
  }

  var shapeRotateInput = root.querySelector('[data-shape-rotate]');
  if (shapeRotateInput) {
    var shapeRotateLabel = root.querySelector('[data-shape-rotate-label]');
    function syncShapeRotate(input) {
      var value = clamp(Number(input.value), -180, 180);
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      activeLayer.rotate = value;
      syncLegacyShapeFields();
      input.style.setProperty('--pct', sliderPercent(value, -180, 180) + '%');
      if (shapeRotateLabel) shapeRotateLabel.innerHTML = sliderValueHtml(value, '°');
      syncWizardPrimaryShapeDom();
    }
    shapeRotateInput.addEventListener('input', function(){
      syncShapeRotate(shapeRotateInput);
    });
    shapeRotateInput.addEventListener('change', function(){
      syncShapeRotate(shapeRotateInput);
      commitWizardChange(false);
    });
  }

  root.querySelectorAll('[data-icon-choice]').forEach(function(button){
    button.addEventListener('click', function(){
      state.designSelectionTouched = true;
      state.wizardDraft.design.iconPreset = button.getAttribute('data-icon-choice') || state.wizardDraft.design.iconPreset;
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-shape-fill]').forEach(function(button){
    button.addEventListener('click', function(){
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      activeLayer.colorMode = 'custom';
      activeLayer.fill = button.getAttribute('data-shape-fill') || '';
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-wizard-palette-expand]').forEach(function(button){
    button.addEventListener('click', function(){
      var key = button.getAttribute('data-wizard-palette-expand') || '';
      if (!key) return;
      state.paletteExpanded = state.paletteExpanded || {};
      state.paletteExpanded[key] = !state.paletteExpanded[key];
      renderApp(true);
    });
  });

  root.querySelectorAll('[data-shape-fill-input]').forEach(function(input){
    input.addEventListener('input', function(){
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      activeLayer.colorMode = 'custom';
      activeLayer.fill = input.value || '';
      var label = input.closest('.brandCurrentSw, .brandCustomBtn');
      if (label) label.style.background = input.value || '';
      if (label) label.style.setProperty('--pick', input.value || '');
      syncWizardPrimaryShapeDom();
    });
    input.addEventListener('change', function(){
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      activeLayer.colorMode = 'custom';
      activeLayer.fill = input.value || '';
      commitWizardChange(false);
    });
  });

  var shapeFillToneInput = root.querySelector('[data-shape-fill-tone]');
  if (shapeFillToneInput) {
    var shapeFillToneLabel = root.querySelector('[data-shape-fill-tone-label]');
    function syncShapeFillTone(input) {
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      var value = clamp(Number(input.value), -100, 100);
      activeLayer.fillTone = value;
      input.style.setProperty('--pct', sliderPercent(value, -100, 100) + '%');
      if (shapeFillToneLabel) shapeFillToneLabel.innerHTML = sliderValueHtml((value > 0 ? '+' : '') + value, '');
    }
    shapeFillToneInput.addEventListener('input', function(){
      syncShapeFillTone(shapeFillToneInput);
    });
    shapeFillToneInput.addEventListener('change', function(){
      syncShapeFillTone(shapeFillToneInput);
      commitWizardChange(false);
    });
  }

  var shapeFillOpacityInput = root.querySelector('[data-shape-fill-opacity]');
  if (shapeFillOpacityInput) {
    var shapeFillOpacityLabel = root.querySelector('[data-shape-fill-opacity-label]');
    function syncShapeFillOpacity(input) {
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      var value = clamp(Number(input.value), 0, 100);
      activeLayer.fillOpacity = value / 100;
      input.style.setProperty('--pct', sliderPercent(value, 0, 100) + '%');
      if (shapeFillOpacityLabel) shapeFillOpacityLabel.innerHTML = sliderValueHtml(value, '%');
    }
    shapeFillOpacityInput.addEventListener('input', function(){
      syncShapeFillOpacity(shapeFillOpacityInput);
    });
    shapeFillOpacityInput.addEventListener('change', function(){
      syncShapeFillOpacity(shapeFillOpacityInput);
      commitWizardChange(false);
    });
  }

  var iconSearchInput = document.getElementById('iconSearchInput');
  if (iconSearchInput) {
    iconSearchInput.addEventListener('input', function(){
      state.iconSearchQuery = iconSearchInput.value || '';
      renderApp(true);
    });
  }

  root.querySelectorAll('[data-card-color]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.colors = state.wizardDraft.colors || {};
      state.wizardDraft.colors.cardColor = button.getAttribute('data-card-color') || '';
      syncWizardManualBackgroundPalette();
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-card-color-input]').forEach(function(input){
    input.addEventListener('input', function(){
      state.wizardDraft.colors = state.wizardDraft.colors || {};
      state.wizardDraft.colors.cardColor = input.value || '';
      var label = input.closest('.brandCurrentSw, .brandCustomBtn');
      if (label) label.style.background = input.value || '';
      if (label) label.style.setProperty('--pick', input.value || '');
      syncWizardManualBackgroundPalette();
      scheduleWizardPreviewRefresh();
    });
    input.addEventListener('change', function(){
      state.wizardDraft.colors = state.wizardDraft.colors || {};
      state.wizardDraft.colors.cardColor = input.value || '';
      syncWizardManualBackgroundPalette();
      commitWizardChange(false);
    });
  });

  var cardToneInput = root.querySelector('[data-card-tone]');
  if (cardToneInput) {
    var cardToneLabel = root.querySelector('[data-card-tone-label]');
    function syncCardTone(input) {
      var value = clamp(Number(input.value), -100, 100);
      state.wizardDraft.colors = state.wizardDraft.colors || {};
      state.wizardDraft.colors.cardTone = value;
      input.style.setProperty('--pct', sliderPercent(value, -100, 100) + '%');
      if (cardToneLabel) cardToneLabel.innerHTML = sliderValueHtml((value > 0 ? '+' : '') + value, '');
    }
    cardToneInput.addEventListener('input', function(){
      syncCardTone(cardToneInput);
    });
    cardToneInput.addEventListener('change', function(){
      syncCardTone(cardToneInput);
      commitWizardChange(false);
    });
  }

  var bgAutoToggle = root.querySelector('[data-bg-auto]');
  if (bgAutoToggle) {
    bgAutoToggle.addEventListener('change', function(){
      var bg = ensureWizardBackgroundConfig();
      bg.autoMode = !!bgAutoToggle.checked;
      commitWizardChange(false);
    });
  }

  function wireBackgroundRange(selector, labelSelector, field, min, max, suffix, formatter) {
    var input = root.querySelector(selector);
    if (!input) return;
    var label = labelSelector ? root.querySelector(labelSelector) : null;
    function syncRange() {
      var raw = Number(input.value);
      var value = Math.max(min, Math.min(max, raw));
      var bg = ensureWizardBackgroundConfig();
      bg[field] = value;
      input.style.setProperty('--pct', sliderPercent(value, min, max) + '%');
      if (label) label.innerHTML = sliderValueHtml(formatter ? formatter(value) : value, suffix);
      renderPreviewBackground();
    }
    input.addEventListener('input', syncRange);
    input.addEventListener('change', function(){
      syncRange();
      commitWizardChange(false);
    });
  }

  wireBackgroundRange('[data-bg-count]', '[data-bg-count-label]', 'blobCount', 2, 22, '', function(value){ return Math.round(value); });
  wireBackgroundRange('[data-bg-size]', '[data-bg-size-label]', 'sizeScale', 0.3, 2.4, '×');
  wireBackgroundRange('[data-bg-alpha]', '[data-bg-alpha-label]', 'alphaBoost', 0.2, 3.2, '×');

  root.querySelectorAll('[data-typography-target]').forEach(function(button){
    button.addEventListener('click', function(){
      setTypographyTarget(button.getAttribute('data-typography-target'));
      commitWizardChange(false);
    });
  });

  var typographyPresetSelect = root.querySelector('#typographyPresetSelect');
  if (typographyPresetSelect) {
    typographyPresetSelect.addEventListener('change', function(){
      applyTypographyPresetChoice(typographyPresetSelect.value || state.wizardDraft.typography.preset);
      commitWizardChange(false);
    });
  }

  var titleFontSelect = root.querySelector('#titleFontSelect');
  if (titleFontSelect) {
    titleFontSelect.addEventListener('change', function(){
      if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
        ensureWizardCoverTextItem(0).font = normalizeTypographyFont(titleFontSelect.value, panelTitleFontValue());
      } else {
        state.wizardDraft.typography.titleFont = normalizeTypographyFont(titleFontSelect.value, effectiveTitleFont());
      }
      commitWizardChange(false);
    });
  }

  var bodyFontSelect = root.querySelector('#bodyFontSelect');
  if (bodyFontSelect) {
    bodyFontSelect.addEventListener('change', function(){
      if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
        ensureWizardCoverTextItem(1).font = normalizeTypographyFont(bodyFontSelect.value, panelBodyFontValue());
      } else {
        state.wizardDraft.typography.bodyFont = normalizeTypographyFont(bodyFontSelect.value, effectiveBodyFont());
      }
      commitWizardChange(false);
    });
  }

  var titlePtSelect = root.querySelector('#titlePtSelect');
  if (titlePtSelect) {
    titlePtSelect.addEventListener('change', function(){
      if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
        ensureWizardCoverTextItem(0).size = clampTypographyPoint(titlePtSelect.value, panelTitlePointValue(), 14, 42);
      } else {
        state.wizardDraft.typography.titlePt = String(titlePtSelect.value || effectiveTitlePt());
      }
      commitWizardChange(false);
    });
  }

  var bodyPtSelect = root.querySelector('#bodyPtSelect');
  if (bodyPtSelect) {
    bodyPtSelect.addEventListener('change', function(){
      if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
        ensureWizardCoverTextItem(1).size = clampTypographyPoint(bodyPtSelect.value, panelBodyPointValue(), 10, 28);
      } else {
        state.wizardDraft.typography.bodyPt = String(bodyPtSelect.value || effectiveBodyPt());
      }
      commitWizardChange(false);
    });
  }

  var textWeightSelect = root.querySelector('#textWeightSelect');
  if (textWeightSelect) {
    textWeightSelect.addEventListener('change', function(){
      setWizardTextWeight(textWeightSelect.value);
      commitWizardChange(false);
    });
  }

  root.querySelectorAll('[data-text-italic]').forEach(function(button){
    button.addEventListener('click', function(){
      toggleWizardTextItalic();
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-text-underline]').forEach(function(button){
    button.addEventListener('click', function(){
      toggleWizardTextUnderline();
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-text-bold]').forEach(function(button){
    button.addEventListener('click', function(){
      setWizardTextWeight(effectiveTextWeight() === 'regular' ? 'bold' : 'regular');
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-text-align]').forEach(function(button){
    button.addEventListener('click', function(){
      setWizardTextAlign(button.getAttribute('data-text-align') || 'center');
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-text-valign]').forEach(function(button){
    button.addEventListener('click', function(){
      setWizardTextValign(button.getAttribute('data-text-valign') || 'center');
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-text-color]').forEach(function(button){
    button.addEventListener('click', function(){
      setWizardTextColor(button.getAttribute('data-text-color') || '');
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-text-font-option]').forEach(function(button){
    button.addEventListener('click', function(){
      var role = button.getAttribute('data-text-font-role') || 'body';
      var nextFont = normalizeTypographyFont(button.getAttribute('data-text-font-option') || '', role === 'title' ? panelTitleFontValue() : panelBodyFontValue());
      if (role === 'title') {
        if (normalizeTypographyTarget(state.typographyTarget) === 'cover') ensureWizardCoverTextItem(0).font = nextFont;
        else state.wizardDraft.typography.titleFont = nextFont;
      } else {
        if (normalizeTypographyTarget(state.typographyTarget) === 'cover') ensureWizardCoverTextItem(1).font = nextFont;
        else state.wizardDraft.typography.bodyFont = nextFont;
      }
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-text-size-option]').forEach(function(button){
    button.addEventListener('click', function(){
      var role = button.getAttribute('data-text-size-role') || 'body';
      var nextValue = String(button.getAttribute('data-text-size-option') || (role === 'title' ? panelTitlePointValue() : panelBodyPointValue()));
      if (role === 'title') {
        if (normalizeTypographyTarget(state.typographyTarget) === 'cover') ensureWizardCoverTextItem(0).size = clampTypographyPoint(nextValue, panelTitlePointValue(), 14, 42);
        else state.wizardDraft.typography.titlePt = nextValue;
      } else {
        if (normalizeTypographyTarget(state.typographyTarget) === 'cover') ensureWizardCoverTextItem(1).size = clampTypographyPoint(nextValue, panelBodyPointValue(), 10, 28);
        else state.wizardDraft.typography.bodyPt = nextValue;
      }
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-title-pt]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.typography.titlePt = String(button.getAttribute('data-title-pt') || effectiveTitlePt());
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-body-pt]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.typography.bodyPt = String(button.getAttribute('data-body-pt') || effectiveBodyPt());
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-theme-select]').forEach(function(button){
    button.addEventListener('click', function(){
      state.activeThemeId = button.getAttribute('data-theme-select') || state.activeThemeId;
      state.previewTarget = 'theme';
      commitWizardChange(false);
    });
  });

  var addThemeButton = root.querySelector('[data-add-theme]');
  if (addThemeButton) {
    addThemeButton.addEventListener('click', function(){
      addTheme();
      commitWizardChange(false);
    });
  }

  root.querySelectorAll('[data-remove-theme]').forEach(function(button){
    button.addEventListener('click', function(){
      removeTheme(button.getAttribute('data-remove-theme') || '');
      commitWizardChange(false);
    });
  });

  bindInput('themeNameInput', function(value){
    var theme = getActiveTheme();
    if (!theme) return;
    theme.name = value;
    commitWizardChange(true);
  });

  bindInput('questionsInput', function(value){
    state.wizardDraft.questions[state.activeThemeId] = value;
  });

  bindTextareaPreview('questionsInput', function(value){
    state.wizardDraft.questions[state.activeThemeId] = value;
    commitWizardChange(true);
  });

  var sampleButton = root.querySelector('[data-fill-sample]');
  if (sampleButton) {
    sampleButton.addEventListener('click', function(){
      var existing = String(state.wizardDraft.questions[state.activeThemeId] || '').trim();
      state.wizardDraft.questions[state.activeThemeId] = existing
        ? existing + '\n' + SAMPLE_QUESTIONS.join('\n')
        : SAMPLE_QUESTIONS.join('\n');
      commitWizardChange(false);
    });
  }

  bindInput('coverTitleInput', function(value){
    ensureWizardCoverTextItem(0).text = value;
    commitWizardChange(true);
  });

  bindInput('coverSubtitleInput', function(value){
    ensureWizardCoverTextItem(1).text = value;
    commitWizardChange(true);
  });

  root.querySelectorAll('[data-visibility-choice]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.visibility = button.getAttribute('data-visibility-choice') || state.wizardDraft.visibility;
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-info-choice]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.infoPage.enabled = button.getAttribute('data-info-choice') === '1';
      commitWizardChange(false);
    });
  });

  bindInput('infoTitleInput', function(value){
    state.wizardDraft.infoPage.title = value;
    commitWizardChange(true);
  });
  bindTextareaPreview('infoIntroInput', function(value){
    state.wizardDraft.infoPage.intro = value;
    commitWizardChange(true);
  });
  bindTextareaPreview('infoUsageInput', function(value){
    state.wizardDraft.infoPage.usage = value;
    commitWizardChange(true);
  });

  root.querySelectorAll('[data-nav="next"]').forEach(function(nextButton){
    nextButton.addEventListener('click', function(){
      handleNext();
    });
  });

  root.querySelectorAll('[data-nav="back"]').forEach(function(backButton){
    backButton.addEventListener('click', function(){
      setStepIndex(state.stepIndex - 1);
      commitWizardChange(false);
    });
  });
}

function bindInput(id, onChange) {
  var input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('input', function(){
    onChange(input.value);
  });
}

function bindTextareaPreview(id, onChange) {
  var field = document.getElementById(id);
  if (!field) return;
  field.addEventListener('input', function(){
    onChange(field.value);
  });
}

function normalizeThemeMode(value) {
  return String(value || '').trim() === 'multiple' ? 'multiple' : 'single';
}

function setThemeMode(value) {
  var mode = normalizeThemeMode(value);
  state.wizardDraft.themeMode = mode;
  if (mode === 'multiple') {
    ensureMinimumThemes(2);
    state.previewTarget = 'theme';
  } else {
    trimEmptyGeneratedThemes();
    if (!state.wizardDraft.themes.some(function(theme){ return theme.id === state.activeThemeId; })) {
      state.activeThemeId = (state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1';
    }
  }
}

function normalizePreviewTarget(value) {
  return String(value || '').trim() === 'theme' ? 'theme' : 'cover';
}

function setPreviewTarget(value, themeId) {
  var target = normalizePreviewTarget(value);
  state.previewTarget = target;
  if (target === 'theme') {
    if (themeId && state.wizardDraft.themes.some(function(theme){ return theme.id === themeId; })) {
      state.activeThemeId = themeId;
    } else if (!state.wizardDraft.themes.some(function(theme){ return theme.id === state.activeThemeId; })) {
      state.activeThemeId = (state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1';
    }
    if (isDesignStep() && getDesignSubstep().id === 'type') state.typographyTarget = 'cards';
  } else if (isDesignStep() && getDesignSubstep().id === 'type') {
    state.typographyTarget = 'cover';
  }
}

function syncContextForStep(stepId) {
  stepId = stepId || currentStepId();
  if (stepId === 'design' && getDesignSubstep().id === 'type') {
    state.previewTarget = state.typographyTarget === 'cover' ? 'cover' : 'theme';
    if (state.previewTarget === 'theme' && !state.wizardDraft.themes.some(function(theme){ return theme.id === state.activeThemeId; })) {
      state.activeThemeId = (state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1';
    }
    return;
  }
  if (stepId === 'questions') {
    state.previewTarget = 'theme';
    if (!state.wizardDraft.themes.some(function(theme){ return theme.id === state.activeThemeId; })) {
      state.activeThemeId = (state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1';
    }
    return;
  }
  if (stepId === 'cover') {
    state.previewTarget = 'cover';
  }
}

function setStepIndex(nextIndex) {
  state.stepIndex = Math.max(0, Math.min(STEP_DEFS.length - 1, Number(nextIndex) || 0));
  syncContextForStep(currentStepId());
}

function ensureMinimumThemes(count) {
  count = Math.max(1, Number(count) || 1);
  while (state.wizardDraft.themes.length < count) addTheme();
}

function trimEmptyGeneratedThemes() {
  var themes = state.wizardDraft.themes || [];
  if (themes.length <= 1) return;
  var keep = themes[0];
  var removable = themes.slice(1).every(function(theme, index){
    var text = String(state.wizardDraft.questions[theme.id] || '').trim();
    var defaultName = 'Thema ' + (index + 2);
    return !text && (!theme.name || theme.name === defaultName);
  });
  if (!removable) return;
  themes.slice(1).forEach(function(theme){
    delete state.wizardDraft.questions[theme.id];
  });
  state.wizardDraft.themes = [keep];
  state.activeThemeId = keep.id;
}

function addTheme() {
  var nextIndex = state.wizardDraft.themes.length + 1;
  var id = 'theme-' + Date.now().toString(36) + '-' + nextIndex;
  var theme = { id: id, name: 'Thema ' + nextIndex };
  state.wizardDraft.themes.push(theme);
  state.wizardDraft.questions[id] = '';
  state.activeThemeId = id;
  state.wizardDraft.themeMode = 'multiple';
  state.previewTarget = 'theme';
}

function removeTheme(id) {
  if (!id || state.wizardDraft.themes.length <= 1) return;
  state.wizardDraft.themes = state.wizardDraft.themes.filter(function(theme){
    return theme.id !== id;
  });
  delete state.wizardDraft.questions[id];
  state.activeThemeId = state.wizardDraft.themes[0].id;
}

function getActiveTheme() {
  return state.wizardDraft.themes.find(function(theme){
    return theme.id === state.activeThemeId;
  }) || state.wizardDraft.themes[0] || null;
}

async function handleNext() {
  state.error = '';
  if (isNextDisabled()) return;
  if (state.stepIndex === STEP_DEFS.length - 2) {
    await saveDraftAsSet();
    return;
  }
  setStepIndex(state.stepIndex + 1);
  commitWizardChange(false);
}

function isNextDisabled() {
  if (state.saving) return true;
  if (currentStepId() === 'name') return !state.wizardDraft.name.trim();
  if (currentStepId() === 'questions') return countAllQuestions() < 1;
  return false;
}

function isStepDone(index) {
  var stepId = STEP_DEFS[index] && STEP_DEFS[index].id;
  if (stepId === 'name') return !!state.wizardDraft.name.trim();
  if (stepId === 'questions') return countAllQuestions() > 0;
  if (stepId === 'publish' || stepId === 'done') return !!state.createdSet;
  return index < state.stepIndex;
}

function canJumpToStep(index) {
  if (state.createdSet) return index === STEP_DEFS.length - 1;
  return index <= state.stepIndex;
}

async function saveDraftAsSet() {
  state.saving = true;
  state.error = '';
  renderApp();
  try {
    var existingId = state.editingSet && state.editingSet.id ? state.editingSet.id : '';
    var setId = existingId || crypto.randomUUID();
    var row = buildSetPayload(setId);
    var saveResp = existingId
      ? await supabase.from('sets').update(row).eq('id', existingId).eq('space_id', state.space.id)
      : await supabase.from('sets').insert(Object.assign({ id: setId }, row));
    if (saveResp.error) throw saveResp.error;
    state.createdSet = {
      id: setId,
      slug: row.slug,
      visibility: row.visibility
    };
    if (existingId) {
      state.editingSet.slug = row.slug;
      state.editingSet.sort_order = row.sort_order;
      state.existingSets = state.existingSets.map(function(set){
        if (!set || set.id !== existingId) return set;
        return {
          id: existingId,
          slug: row.slug,
          sort_order: row.sort_order
        };
      });
    } else {
      state.editingSet = {
        id: setId,
        slug: row.slug,
        sort_order: row.sort_order
      };
      state.existingSets.push({ id: setId, slug: row.slug, sort_order: row.sort_order });
    }
    setStepIndex(STEP_DEFS.length - 1);
    resetWizardHistory();
    syncCanonicalWizardRoute();
  } catch (err) {
    state.error = err && err.message ? err.message : 'Opslaan mislukte.';
  } finally {
    state.saving = false;
    renderApp();
  }
}

function buildSetPayload(setId) {
  var uniqueSlug = buildUniqueSlug(state.wizardDraft.slug || state.wizardDraft.name || 'kaartenset');
  var bundle = buildBundleFromDraft(setId, uniqueSlug);
  var status = state.wizardDraft.visibility === 'private' ? 'draft' : 'live';
  var visibility = state.wizardDraft.visibility;
  var nextOrder = state.existingSets.reduce(function(max, set){
    return Math.max(max, Number(set && set.sort_order) || 0);
  }, -1) + 1;
  var sortOrder = state.editingSet && Number.isFinite(Number(state.editingSet.sort_order))
    ? Number(state.editingSet.sort_order)
    : nextOrder;
  return {
    space_id: state.space.id,
    slug: uniqueSlug,
    title: state.wizardDraft.name.trim(),
    card_format: state.wizardDraft.format,
    is_public: visibility === 'public',
    status: status,
    visibility: visibility,
    allow_platform_collections: false,
    sort_order: sortOrder,
    bundle: bundle
  };
}

function buildBundleFromDraft(setId, slug) {
  var draft = state.wizardDraft;
  draft.preview = draft.preview || {};
  var palette = getSelectedPalette();
  var accent = getAccentColor();
  var typographyPreset = getTypographyPreset();
  var format = getSelectedFormat();
  var shapeLayers = ensureDesignShapeLayers();
  var designShape = shapeLayers[0] ? {
    x: shapeLayers[0].x,
    y: shapeLayers[0].y,
    size: shapeLayers[0].size,
    rotate: shapeLayers[0].rotate
  } : currentDesignShapeState();
  var themeRecords = buildThemeRecords();
  var questionsByTheme = {};
  var questionCounts = 0;
  var questionIdStore = draft.preview.questionIds && typeof draft.preview.questionIds === 'object'
    ? draft.preview.questionIds
    : (draft.preview.questionIds = {});
  var backStyleData = clonePlainData(draft.preview.backStyleData) || { cssVars: {}, byCard: {} };
  backStyleData.scope = String(draft.preview.backScope || '').trim() === 'card' ? 'card' : 'set';

  themeRecords.forEach(function(record){
    var parsed = parseQuestionLines(state.wizardDraft.questions[record.id] || '', questionIdStore[record.id]);
    questionIdStore[record.id] = parsed.map(function(item){
      return String(item && item._qid || '').trim();
    }).filter(Boolean);
    questionsByTheme[record.key] = parsed;
    questionCounts += parsed.length;
  });

  var meta = {
    id: setId,
    slug: slug,
    title: draft.name.trim(),
    cover: 'voorkant.svg',
    viewerTemplate: 'classic',
    flipAnim: true,
    doubleSided: previewDoubleSided(),
    backMode: previewBackMode(),
    cardFormat: format.id,
    cssVars: buildCssVars(palette, accent, typographyPreset, draft.preview),
    ui: {
      menu: {
        showInfo: !!draft.infoPage.enabled,
        showShuffle: true,
        showAllSets: true
      },
      sheet: {
        enabled: !!draft.infoPage.enabled,
        defaultMode: 'cards',
        showOnFirst: !!draft.infoPage.enabled
      },
      previewGrid: !!(draft.preview && draft.preview.gridMode),
      previewNight: !!(draft.preview && draft.preview.nightMode),
      index: buildIndexUi(draft.preview),
      cardsIndex: buildCardsIndexUi(draft.preview),
      backStyle: backStyleData,
      assetFlow: {
        mode: 'single-source',
        folder: 'cards'
      },
      themeCss: 'theme.css',
      cardModes: buildCardModes(themeRecords),
      cardShapes: buildCardShapes(themeRecords, palette, accent),
      coverTexts: buildCoverTexts(typographyPreset, palette, accent),
      cardBgBaseByKey: buildCardBackgrounds(themeRecords, palette, accent),
      cardBgToneByKey: buildCardTones(themeRecords)
    },
    themes: themeRecords.map(function(record){
      return {
        key: record.key,
        label: record.label,
        card: record.key + '.svg'
      };
    }),
    infoPages: draft.infoPage.enabled ? [{ key: 'cover', title: draft.infoPage.title.trim() || DEFAULT_INFO_PAGE.title }] : [],
    designPreset: draft.palette,
    shapePreset: normalizeShapePresetId((shapeLayers[0] && shapeLayers[0].type) || draft.design.shapePreset),
    shapePosition: designShape,
    iconPreset: draft.design.iconPreset,
    cardColor: effectiveCardColor(),
    backgroundPreset: draft.design.backgroundPreset,
    typographyPreset: draft.typography.preset,
    infoPageEnabled: !!draft.infoPage.enabled,
    infoPageTitle: draft.infoPage.title.trim(),
    infoPageIntro: draft.infoPage.intro.trim(),
    infoPageUsage: draft.infoPage.usage.trim(),
    visibility: draft.visibility,
    questionCount: questionCounts
  };

  var introBody = buildInfoBody();
  var intro = draft.infoPage.enabled
    ? {
        slides: [{
          key: 'cover',
          title: draft.infoPage.title.trim() || DEFAULT_INFO_PAGE.title,
          body: introBody,
          img: 'cards/voorkant.svg',
          alt: draft.name.trim()
        }],
        hint: '\u2190 \u2192 swipe'
      }
    : {
        slides: [],
        hint: '\u2190 \u2192 swipe'
      };

  return {
    meta: meta,
    questions: questionsByTheme,
    uitleg: {
      cover: draft.infoPage.enabled ? introBody : ''
    },
    intro: intro
  };
}

function buildCssVars(palette, accent, typographyPreset, preview) {
  var recipe = backgroundRecipe(palette, accent, null, effectiveCardColor());
  preview = preview && typeof preview === 'object' ? preview : {};
  var cssVars = {
    '--pk-set-accent': accent,
    '--pk-set-bg': recipe.cardBg,
    '--pk-set-card': recipe.cardBg,
    '--pk-set-text': effectiveTextColor(),
    '--pk-font': effectiveBodyFont(),
    '--pk-font-size': questionFontSizeValue(),
    '--pk-text-align': effectiveTextAlign(),
    '--pk-text-valign': effectiveTextValign(),
    '--pk-font-weight': effectiveTextWeight(),
    '--pk-font-italic': effectiveTextItalic() ? '1' : '0',
    '--pk-font-underline': effectiveTextUnderline() ? '1' : '0'
  };
  var cardsPageBg = readCssVarString(preview, 'cardsPageBg');
  var setsBaseBg = readCssVarString(preview, 'setsBaseBg');
  var setsHeaderBg = readCssVarString(preview, 'setsHeaderBg');
  if (cardsPageBg) cssVars['--cardsPageBg'] = cardsPageBg;
  if (setsBaseBg) cssVars['--setsBaseBg'] = setsBaseBg;
  if (setsHeaderBg) cssVars['--setsHeaderBg'] = setsHeaderBg;
  return cssVars;
}

function buildIndexUi(preview) {
  var ui = {
    layout: 'hero-grid'
  };
  var bg = preview && typeof preview === 'object' ? clonePlainData(preview.indexBackground) : null;
  if (bg && typeof bg === 'object') {
    ui.background = bg;
  }
  return ui;
}

function buildCardsIndexUi(preview) {
  var bg = preview && typeof preview === 'object' ? clonePlainData(preview.indexBackground) : null;
  if (bg && typeof bg === 'object') {
    return { background: bg };
  }
  return undefined;
}

function buildCardModes(themeRecords) {
  var modes = { cover: 'self' };
  themeRecords.forEach(function(record){
    modes[record.key] = 'self';
  });
  return modes;
}

function buildCardShapes(themeRecords, palette, accent) {
  var shapes = {
    cover: buildCardShapeLayers('cover', palette, accent)
  };
  themeRecords.forEach(function(record){
    shapes[record.key] = buildCardShapeLayers(record.key, palette, accent);
  });
  return shapes;
}

function buildCardBackgrounds(themeRecords, palette, accent) {
  var recipe = backgroundRecipe(palette, accent, null, effectiveCardColor());
  var map = { cover: recipe.cardBg };
  themeRecords.forEach(function(record){
    map[record.key] = recipe.cardBg;
  });
  return map;
}

function buildCardTones(themeRecords) {
  var tone = effectiveCardTone();
  var map = { cover: tone };
  themeRecords.forEach(function(record){
    map[record.key] = tone;
  });
  return map;
}

function buildCoverTexts(typographyPreset, palette) {
  if (state.wizardDraft && state.wizardDraft.coverTexts !== null && state.wizardDraft.coverTexts !== undefined) {
    return clonePlainData(state.wizardDraft.coverTexts) || [];
  }
  return defaultCoverTexts();
}

function buildInfoBody() {
  var info = state.wizardDraft.infoPage;
  var parts = [];
  if (info.intro.trim()) parts.push(info.intro.trim());
  if (info.usage.trim()) parts.push('Hoe gebruik je deze kaarten?\n' + info.usage.trim());
  return parts.join('\n\n').trim();
}

function buildThemeRecords() {
  var used = Object.create(null);
  return state.wizardDraft.themes.map(function(theme, index){
    var label = String(theme.name || '').trim() || ('Thema ' + (index + 1));
    var base = slugify(label) || ('thema-' + (index + 1));
    var key = uniqueKey(base, used);
    return {
      id: theme.id,
      key: key,
      label: label
    };
  });
}

function uniqueKey(base, used) {
  var key = base;
  var count = 2;
  while (used[key]) {
    key = base + '-' + count;
    count += 1;
  }
  used[key] = true;
  return key;
}

function parseQuestionLines(raw, existingIds) {
  var ids = Array.isArray(existingIds) ? existingIds : [];
  return String(raw || '')
    .split(/\r?\n/)
    .map(function(line){
      return String(line || '').trim();
    })
    .filter(Boolean)
    .map(function(line, index){
      var parts = line.split('|');
      var front = String(parts[0] || '').trim();
      var back = String(parts.slice(1).join('|') || '').trim();
      var qid = String(ids[index] || '').trim() || crypto.randomUUID();
      return {
        _qid: qid,
        voorkant: front,
        achterkant: back,
        q: front,
        back: back
      };
    });
}

function buildPreviewState() {
  var bundle = buildBundleFromDraft('wizard-preview', state.wizardDraft.slug || 'wizard-preview');
  var themeRecords = buildThemeRecords();
  var activeRecord = themeRecords.find(function(record){
    return record.id === state.activeThemeId;
  }) || themeRecords[0] || { key: 'algemeen', label: 'Algemeen' };
  var questions = bundle.questions[activeRecord.key] || [];
  var firstQuestion = questions[0] || { voorkant: 'Wanneer voel jij verbinding in ons team?', achterkant: '' };
  var stepId = currentStepId();
  var previewTarget = normalizePreviewTarget(state.previewTarget);

  if (stepId === 'done') {
      return {
        bundle: bundle,
        previewKey: activeRecord.key,
        previewFile: activeRecord.key + '.svg',
        frontTxt: firstQuestion.voorkant || firstQuestion.q || '',
        backTxt: firstQuestion.achterkant || firstQuestion.back || '',
        backDesignKey: firstQuestion && firstQuestion._qid ? ('__back_card__:' + firstQuestion._qid) : '',
        label: 'Samenvatting',
        caption: 'De set staat nu klaar in je ruimte en kan direct verder worden aangepast in de editor of bekeken in view-modus.',
        html: renderSharedPreview(bundle, activeRecord.key, firstQuestion)
      };
  }

  if (stepAllowsCoverPreview(stepId)) {
    if (previewTarget === 'theme') {
      return {
        bundle: bundle,
        previewKey: activeRecord.key,
        previewFile: activeRecord.key + '.svg',
        frontTxt: firstQuestion.voorkant || firstQuestion.q || '',
        backTxt: firstQuestion.achterkant || firstQuestion.back || '',
        backDesignKey: firstQuestion && firstQuestion._qid ? ('__back_card__:' + firstQuestion._qid) : '',
        label: 'Thema kaart',
        navLabel: themePreviewNavLabel(activeRecord, bundle),
        caption: activeRecord.label + ' is actief. Zo voelt de tekst op een gewone themakaart.',
        html: renderSharedPreview(bundle, activeRecord.key, firstQuestion)
      };
    }
    return {
      bundle: bundle,
      previewKey: 'cover',
      previewFile: 'voorkant.svg',
      frontTxt: '',
      backTxt: '',
      label: 'Cover preview',
      navLabel: 'Cover',
      caption: 'Zo voelt de voorkant nu aan: rustig, ruimtelijk en meteen herkenbaar.',
      html: renderSharedCoverPreview(bundle)
    };
  }

  return {
    bundle: bundle,
    previewKey: activeRecord.key,
    previewFile: activeRecord.key + '.svg',
    frontTxt: firstQuestion.voorkant || firstQuestion.q || '',
    backTxt: firstQuestion.achterkant || firstQuestion.back || '',
    backDesignKey: firstQuestion && firstQuestion._qid ? ('__back_card__:' + firstQuestion._qid) : '',
    label: 'Eerste kaart',
    navLabel: themePreviewNavLabel(activeRecord, bundle),
    caption: activeRecord.label + ' is actief. De eerste vraag uit dit thema wordt meteen als kaart opgebouwd.',
    html: renderSharedPreview(bundle, activeRecord.key, firstQuestion)
  };
}

function themePreviewNavLabel(activeRecord, bundle) {
  var key = activeRecord && activeRecord.key ? activeRecord.key : '';
  var items = key && bundle && bundle.questions && Array.isArray(bundle.questions[key])
    ? bundle.questions[key]
    : [];
  var total = Math.max(1, items.length || 0);
  return '1 / ' + total;
}

function renderSharedCoverPreview(bundle) {
  var renderer = window.PK && window.PK.sharedCardRenderer;
  if (!renderer || typeof renderer.render !== 'function') {
    return '<div class="wizardPreviewRenderer"><div class="wizardMuted">Preview niet beschikbaar.</div></div>';
  }
  return renderer.render({
    meta: bundle.meta,
    wrapClass: 'stijlCardPrevWrap',
    previewKey: 'cover',
    themeKey: 'cover',
    frontTxt: '',
    backTxt: '',
    flipped: previewDoubleSided() && !!state.previewFlipped,
    forceNoImage: true,
    showCoverTexts: true,
    coverTextsHtml: buildCoverTextsHtml(bundle.meta),
    suppressEmptyFrontHint: true
  });
}

function renderSharedPreview(bundle, previewKey, question) {
  var renderer = window.PK && window.PK.sharedCardRenderer;
  if (!renderer || typeof renderer.render !== 'function') {
    return '<div class="wizardPreviewRenderer"><div class="wizardMuted">Preview niet beschikbaar.</div></div>';
  }
  return renderer.render({
    meta: bundle.meta,
    wrapClass: 'stijlCardPrevWrap',
    previewKey: previewKey,
    themeKey: previewKey,
    frontTxt: question && (question.voorkant || question.q || '') || '',
    backTxt: question && (question.achterkant || question.back || '') || '',
    backDesignKey: question && question._qid ? ('__back_card__:' + question._qid) : '',
    flipped: previewDoubleSided() && !!state.previewFlipped,
    forceNoImage: true,
    suppressEmptyFrontHint: true
  });
}

function currentPreviewShellHeight() {
  return wizardPreviewEditingActive() ? PREVIEW_SHELL_HEIGHT_EDITOR : PREVIEW_SHELL_HEIGHT;
}

function previewWindowMetrics() {
  var format = getSelectedFormat();
  var shellHeight = currentPreviewShellHeight();
  var stageStyle = '--preview-shell-max-h:' + shellHeight + 'px;--wizard-preview-shell-h:' + shellHeight + 'px;--editor-preview-card-w:320px';
  return {
    format: format,
    stageStyle: stageStyle,
    shellStyle: [
      '--cardAspect:' + format.width + '/' + format.height,
      '--pk-set-accent:' + getAccentColor()
    ].join(';')
  };
}

function renderPreviewBackground(done) {
  requestAnimationFrame(function(){
    var wrap = document.getElementById('wizardPreviewBgWrap');
    var canvas = document.getElementById('wizardPreviewBgCanvas');
    if (!wrap || !canvas) {
      if (typeof done === 'function') done();
      return;
    }
    var logicalW = Math.round(wrap.clientWidth || wrap.offsetWidth || 0) || PREVIEW_SHELL_WIDTH;
    var logicalH = Math.round(wrap.clientHeight || wrap.offsetHeight || 0) || currentPreviewShellHeight();
    if (logicalW < 20 || logicalH < 20) {
      if (typeof done === 'function') done();
      return;
    }
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(logicalW * dpr);
    canvas.height = Math.round(logicalH * dpr);
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      if (typeof done === 'function') done();
      return;
    }
    var bundle = buildBundleFromDraft('wizard-preview', state.wizardDraft.slug || 'wizard-preview');
    paintWizardPreviewBackground(ctx, canvas.width, canvas.height, bundle);
    if (typeof done === 'function') done();
  });
}

function previewBackgroundState(bundle) {
  var meta = bundle && bundle.meta && typeof bundle.meta === 'object' ? bundle.meta : {};
  var ui = meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
  return clonePlainData(resolveCardsIndexBackground({
    setMeta: meta,
    activeUi: ui
  })) || {};
}

function previewDerivedBackground(bundle, bgConfig) {
  var shapeStore = (bundle && bundle.meta && bundle.meta.ui && bundle.meta.ui.cardShapes) || {};
  bgConfig = bgConfig && typeof bgConfig === 'object' ? bgConfig : {};
  var helper = window.PK && window.PK.autoBackground;
  var derive = helper && typeof helper.derivePaletteAndShapesFromLayers === 'function'
    ? helper.derivePaletteAndShapesFromLayers
    : derivePaletteAndShapesFromLayers;
  var derived = derive({
    meta: bundle && bundle.meta ? bundle.meta : {},
    getCardShapeLayers: function(key) {
      return Array.isArray(shapeStore[key]) ? shapeStore[key] : [];
    },
    cardShapeStore: shapeStore,
    fallbackPalette: DEFAULT_INDEX_BG_PALETTE.slice()
  }) || {};
  var shapes = Array.isArray(derived.shapes) && derived.shapes.length ? derived.shapes.slice() : ['organic'];
  var weightedShapes = Array.isArray(derived.weightedShapes) && derived.weightedShapes.length ? derived.weightedShapes.slice() : shapes.slice();
  return {
    palette: Array.isArray(derived.palette) && derived.palette.length ? derived.palette.slice() : DEFAULT_INDEX_BG_PALETTE.slice(),
    shapes: shapes,
    weightedShapes: weightedShapes,
    count: typeof bgConfig.blobCount === 'number' ? Math.max(2, Math.min(22, Math.round(bgConfig.blobCount))) : 7,
    alphaBoost: typeof bgConfig.alphaBoost === 'number' ? Math.max(0.4, Math.min(3.2, bgConfig.alphaBoost)) : 1.05,
    sizeScale: typeof bgConfig.sizeScale === 'number' ? Math.max(0.3, Math.min(2.4, bgConfig.sizeScale)) : 0.85,
    irregularity: typeof bgConfig.blobIrregularity === 'number' ? Math.max(0.05, Math.min(0.65, bgConfig.blobIrregularity)) : 0.35,
    seedKey: derived.seedKey || [(derived.palette || DEFAULT_INDEX_BG_PALETTE).join('|'), weightedShapes.join('|')].join('__')
  };
}

function previewManualBackgroundShapes(bgConfig) {
  var list = Array.isArray(bgConfig && bgConfig.blobShapes) ? bgConfig.blobShapes.filter(Boolean) : [];
  if (!list.length && bgConfig && bgConfig.blobSpread) list = [bgConfig.blobSpread];
  return list.length ? list : ['organic'];
}

function previewNightEnabled() {
  return !!state.previewNight;
}

function previewGridEnabled() {
  return !!state.previewGrid;
}

function previewGridToggleIconHtml() {
  return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5v11M10.5 2.5v11M2.5 5.5h11M2.5 10.5h11"></path><rect x="2.5" y="2.5" width="11" height="11" rx="2"></rect></svg>';
}

function previewNavArrowIconHtml(direction) {
  return direction === 'back'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
}

function previewNightToggleIconHtml(isNight) {
  return isNight
    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.9 1.8a5.8 5.8 0 1 0 3.3 10.7 6.2 6.2 0 1 1-3.3-10.7Z"></path></svg>'
    : '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4"></circle><path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6"></path></svg>';
}

function previewBackMode() {
  var mode = String((((state.wizardDraft || {}).preview || {}).backMode) || 'mirror').trim();
  return mode === 'reflect' || mode === 'blank' ? mode : 'mirror';
}

function previewBackModeForUi() {
  return state.previewBackModeUiOverride || previewBackMode();
}

function previewBackEditSurface() {
  if (previewBackMode() !== 'blank') return 'front';
  var surface = String((((state.wizardDraft || {}).preview || {}).backEditSurface) || 'back').trim();
  return surface === 'front' ? 'front' : 'back';
}

function previewBackEditSurfaceForUi() {
  return state.previewBackSurfaceUiOverride || previewBackEditSurface();
}

function previewBackScope() {
  var scope = String((((state.wizardDraft || {}).preview || {}).backScope) || 'set').trim();
  return scope === 'card' ? 'card' : 'set';
}

function previewCanUseCardBackScope() {
  if (normalizePreviewTarget(state.previewTarget) !== 'theme') return false;
  var raw = ((state.wizardDraft || {}).questions || {})[state.activeThemeId];
  return !!String(raw || '').trim();
}

function shouldShowPreviewBackExtraControls() {
  return previewBackModeForUi() === 'blank' && previewBackEditSurfaceForUi() === 'back' && !state.previewBackExtraDelayed;
}

function previewDoubleSided() {
  return (((state.wizardDraft || {}).preview || {}).doubleSided) !== false;
}

function getWizardSharedPreviewShell() {
  var helper = window.PK && window.PK.sharedPreviewShell;
  return helper && typeof helper.renderCanvasPreviewShell === 'function'
    ? helper
    : null;
}

function renderPreviewBackbar() {
  if (!wizardPreviewEditingActive()) return '';
  if (!previewDoubleSided()) return '';
  var backMode = previewBackModeForUi();
  var backSurface = previewBackEditSurfaceForUi();
  var backScope = previewBackScope();
  var showExtra = shouldShowPreviewBackExtraControls();
  var canUseCardScope = previewCanUseCardBackScope();
  var sharedPreviewShell = getWizardSharedPreviewShell();
  if (!sharedPreviewShell) return '';
  var frontSurfaceAttrs = (showExtra ? '' : ' tabindex="-1"') +
    ' onclick="window.PK.wizardPreview.setBackEditSurface(\'front\');return false;"';
  var backSurfaceAttrs = (showExtra ? '' : ' tabindex="-1"') +
    ' onclick="window.PK.wizardPreview.setBackEditSurface(\'back\');return false;"';
  var setScopeAttrs = (showExtra ? '' : ' tabindex="-1"') +
    ' onclick="window.PK.wizardPreview.setBackScope(\'set\');return false;"';
  var cardScopeOnclick = canUseCardScope
    ? "window.PK.wizardPreview.setBackScope('card');return false;"
    : 'return false;';
  var cardScopeAttrs =
    (canUseCardScope ? '' : ' aria-disabled="true"') +
    ((showExtra && canUseCardScope) ? '' : ' tabindex="-1"') +
    ' onclick="' + cardScopeOnclick + '"';
  return sharedPreviewShell.buildBackbarHtml({
    enabled: true,
    label: 'Achterkant',
    modes: [
      {
        label: 'Zelfde',
        selected: backMode === 'mirror',
        title: 'Zelfde ontwerp',
        attrText: ' data-preview-back-mode="mirror" onclick="window.PK.wizardPreview.setBackMode(\'mirror\');return false;"'
      },
      {
        label: 'Gespiegeld',
        selected: backMode === 'reflect',
        title: 'Zelfde ontwerp gespiegeld',
        attrText: ' data-preview-back-mode="reflect" onclick="window.PK.wizardPreview.setBackMode(\'reflect\');return false;"'
      },
      {
        label: 'Eigen',
        selected: backMode === 'blank',
        title: 'Eigen achterkant',
        attrText: ' data-preview-back-mode="blank" onclick="window.PK.wizardPreview.setBackMode(\'blank\');return false;"'
      }
    ],
    extraHtml:
      '<div class="previewEditSurfaceStack'+(showExtra?' is-visible':' is-hidden')+'"'+(showExtra?'':' aria-hidden="true"')+'>'+
        '<div class="previewEditSurfacePill previewEditSurfacePill-surface">'+
          '<button class="previewEditSurfaceBtn'+(backSurface!=='back'?' sel':'')+'" data-back-edit-surface="front" type="button"'+frontSurfaceAttrs+'>Voor</button>'+
          '<button class="previewEditSurfaceBtn'+(backSurface==='back'?' sel':'')+'" data-back-edit-surface="back" type="button"'+backSurfaceAttrs+'>Achter</button>'+
        '</div>'+
        '<div class="previewEditSurfacePill previewEditSurfacePill-scope">'+
          '<button class="previewEditSurfaceBtn'+(backScope!=='card'?' sel':'')+'" data-back-scope="set" type="button"'+setScopeAttrs+'>Hele set</button>'+
          '<button class="previewEditSurfaceBtn'+(backScope==='card'?' sel':'')+(canUseCardScope?'':' is-disabled')+'" data-back-scope="card" type="button"'+cardScopeAttrs+'>Deze kaart</button>'+
        '</div>'+
      '</div>'
  });
}

function previewBackgroundBaseFill(bundle, bgConfig, isNight) {
  bgConfig = bgConfig && typeof bgConfig === 'object' ? bgConfig : previewBackgroundState(bundle);
  if (isNight) {
    var nightHelper = window.PK && window.PK.previewBackground;
    if (nightHelper && typeof nightHelper.baseVar === 'function') {
      return nightHelper.baseVar('--pk-cards-index-dark-bg', '#1b1840', document.documentElement);
    }
    return '#1b1840';
  }
  if (bgConfig && bgConfig.autoTint === false) return '#F8FAFA';
  var cssVars = (bundle && bundle.meta && bundle.meta.cssVars) || {};
  var explicit = String(cssVars['--cardsPageBg'] || '').trim();
  if (explicit) return explicit;
  var helper = window.PK && window.PK.previewBackground;
  if (helper && typeof helper.baseVar === 'function') {
    return helper.baseVar('--pk-cards-index-bg', '#FAFAF8', document.documentElement);
  }
  return defaultWizardCardsPageBg();
}

function paintWizardPreviewBackground(ctx, width, height, bundle) {
  if (!ctx) return;
  var bgConfig = previewBackgroundState(bundle);
  var isNight = previewNightEnabled();
  var helper = window.PK && window.PK.previewBackground;
  var autoMode = bgConfig.autoMode !== false;
  var autoSettings = autoMode ? previewDerivedBackground(bundle, bgConfig) : null;
  var palette = autoSettings
    ? autoSettings.palette
    : (Array.isArray(bgConfig.palette) && bgConfig.palette.length ? bgConfig.palette.slice() : wizardManualBackgroundPalette());
  var darkPalette = Array.isArray(bgConfig.darkPalette) && bgConfig.darkPalette.length
    ? bgConfig.darkPalette.slice()
    : ['#67C5BB', '#74CEC4', '#7FD1C8', '#8AD8D0', '#93DCD4'];
  var count = Math.max(1, Math.round(autoSettings ? autoSettings.count : (typeof bgConfig.blobCount === 'number' ? bgConfig.blobCount : 6)));
  var alphaBoost = autoSettings ? autoSettings.alphaBoost : (typeof bgConfig.alphaBoost === 'number' ? bgConfig.alphaBoost : 1);
  var sizeScale = autoSettings ? autoSettings.sizeScale : (typeof bgConfig.sizeScale === 'number' ? bgConfig.sizeScale : 1);
  var irregularity = autoSettings ? autoSettings.irregularity : (typeof bgConfig.blobIrregularity === 'number' ? bgConfig.blobIrregularity : 0.35);
  var shapeSource = autoSettings
    ? (autoSettings.weightedShapes.length ? autoSettings.weightedShapes : autoSettings.shapes)
    : previewManualBackgroundShapes(bgConfig);
  var seedShapes = autoSettings
    ? (autoSettings.weightedShapes.length ? autoSettings.weightedShapes : autoSettings.shapes)
    : shapeSource;
  var baseFill = previewBackgroundBaseFill(bundle, bgConfig, isNight);
  if (helper && typeof helper.drawToCanvas === 'function') {
    helper.drawToCanvas(ctx, {
      width: width,
      height: height,
      isNight: isNight,
      baseFill: baseFill,
      palette: palette,
      darkPalette: darkPalette,
      count: count,
      alphaBoost: alphaBoost,
      darkAlphaBoost: typeof bgConfig.darkAlphaBoost === 'number' ? bgConfig.darkAlphaBoost : 1.02,
      sizeScale: sizeScale,
      darkSizeScale: typeof bgConfig.darkSizeScale === 'number' ? bgConfig.darkSizeScale : 1,
      darkMix: typeof bgConfig.darkMix === 'number' ? bgConfig.darkMix : 0.12,
      irregularity: irregularity,
      shapeSource: shapeSource,
      seedShapes: seedShapes,
      seedKey: autoSettings && autoSettings.seedKey
        ? autoSettings.seedKey
        : [palette.join('|'), String(count), seedShapes.join('|')].join('__')
    });
    return;
  }
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = baseFill;
  ctx.fillRect(0, 0, width, height);
}

function wizardPreviewElements() {
  var shell = root.querySelector('.stijlCanvasWindow[data-wizard-preview="1"]');
  if (!shell) return null;
  return {
    viewport: root.querySelector('#wizardPreviewViewport'),
    scaleFrame: null,
    shell: shell,
    cardWrap: shell.closest('.stijlCanvasCardWrap'),
    wrap: shell.querySelector('.stijlCardPrevWrap'),
    visual: shell.querySelector('.stijlCardPrevWrap .cardFaceOuter, .stijlCardPrevWrap .adminInfoSlide'),
    faceInner: shell.querySelector('.cardFaceInner'),
    topbar: shell.querySelector('.stijlCanvasTopbar'),
    zoomControl: shell.querySelector('.cvZoomControl'),
    zoomPct: shell.querySelector('.cvZoomPct'),
    flipButtons: Array.prototype.slice.call(shell.querySelectorAll('.stijlCanvasFlipBtn')),
    backModeButtons: Array.prototype.slice.call(shell.querySelectorAll('[data-preview-back-mode]')),
    gridButtons: Array.prototype.slice.call(shell.querySelectorAll('[data-preview-grid-toggle="1"]')),
    nightButtons: Array.prototype.slice.call(shell.querySelectorAll('[data-preview-night-toggle="1"]'))
  };
}

function getWizardPreviewInteractionHelper() {
  return window.PK && window.PK.sharedPreviewInteractions;
}

function clearWizardPreviewModeTimers() {
  var controller = wizardPreviewBackModeController;
  if (controller && typeof controller.clearTimers === 'function') controller.clearTimers();
}

function buildWizardPreviewWrapFromState() {
  var host = document.createElement('div');
  host.innerHTML = buildPreviewState().html;
  return host.querySelector('.stijlCardPrevWrap');
}

function replaceWizardPreviewBackFaceDom() {
  var els = wizardPreviewElements();
  if (!els || !els.wrap) return false;
  var nextWrap = buildWizardPreviewWrapFromState();
  if (!nextWrap) return false;
  var currentFaceInner = els.wrap.querySelector('.cardFaceInner');
  var nextFaceInner = nextWrap.querySelector('.cardFaceInner');
  if (!currentFaceInner || !nextFaceInner) {
    els.wrap.outerHTML = nextWrap.outerHTML;
    return true;
  }
  var currentBack = currentFaceInner.querySelector('.cardFaceBack');
  var nextBack = nextFaceInner.querySelector('.cardFaceBack');
  if (!currentBack || !nextBack) {
    els.wrap.outerHTML = nextWrap.outerHTML;
    return true;
  }
  currentBack.replaceWith(nextBack);
  return true;
}

function getWizardPreviewBackModeController() {
  if (wizardPreviewBackModeController) return wizardPreviewBackModeController;
  var helper = getWizardPreviewInteractionHelper();
  if (!helper || typeof helper.createBackModeController !== 'function') return null;
  wizardPreviewBackModeController = helper.createBackModeController({
    getElements: wizardPreviewElements,
    isDoubleSided: previewDoubleSided,
    getFlipped: function(){ return !!state.previewFlipped; },
    setFlipped: function(isFlipped){
      state.previewFlipped = !!isFlipped;
      syncEmbeddedPreview();
    },
    getBackMode: previewBackMode,
    commitBackMode: function(mode){
      state.wizardDraft.preview = state.wizardDraft.preview || {};
      var prevMode = previewBackMode();
      var prevSurface = previewBackEditSurface();
      var wasFlipped = !!state.previewFlipped;
      var changed = prevMode !== mode;
      var spinAdvance = !!(changed && wasFlipped);
      state.wizardDraft.preview.backMode = mode;
      state.wizardDraft.preview.backEditSurface = mode === 'blank' ? 'back' : 'front';
      if (changed && (!wasFlipped || spinAdvance)) {
        state.previewBackModeUiOverride = prevMode;
        state.previewBackSurfaceUiOverride = (prevMode === 'blank' || mode === 'blank') ? prevSurface : '';
      } else {
        state.previewBackModeUiOverride = '';
        state.previewBackSurfaceUiOverride = '';
      }
      state.previewBackExtraDelayed = mode === 'blank' && changed && !wasFlipped;
      pushWizardHistory();
    },
    applyUiState: applyWizardPreviewUiState,
    replaceBackFaceDom: replaceWizardPreviewBackFaceDom,
    afterSwap: function(){
      state.previewBackModeUiOverride = '';
      state.previewBackSurfaceUiOverride = '';
      state.previewBackExtraDelayed = false;
      applyWizardPreviewUiState();
      syncEmbeddedPreview();
    }
  });
  return wizardPreviewBackModeController;
}

function setWizardPreviewFlipState(isFlipped) {
  state.previewFlipped = !!isFlipped;
  applyWizardPreviewUiState();
  syncEmbeddedPreview();
}

function previewWindowIsVisible(win) {
  if (!win || !win.getBoundingClientRect) return false;
  var rect = win.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return false;
  var cs = window.getComputedStyle ? window.getComputedStyle(win) : null;
  if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
  return true;
}

function wizardPreviewShellScale() {
  return 1;
}

function scheduleWizardPreviewRefresh() {
  if (previewRefreshRaf) cancelAnimationFrame(previewRefreshRaf);
  previewRefreshRaf = requestAnimationFrame(function(){
    previewRefreshRaf = 0;
    applyWizardPreviewUiState();
    renderPreviewBackground();
  });
}

function syncWizardPreviewScale() {
  var viewport = root.querySelector('#wizardPreviewViewport');
  if (!viewport) return;
  viewport.style.height = '';
}

function syncWizardPreviewLayout() {
  var els = wizardPreviewElements();
  if (!els || !previewWindowIsVisible(els.shell) || !els.wrap) return;
  var sharedPreviewShell = getWizardSharedPreviewShell();
  var sharedLayoutSync = sharedPreviewShell && typeof sharedPreviewShell.syncCanvasPreviewWindowLayout === 'function'
    ? sharedPreviewShell.syncCanvasPreviewWindowLayout
    : (window.PK && typeof window.PK.syncCanvasPreviewWindowLayout === 'function'
      ? window.PK.syncCanvasPreviewWindowLayout
      : null);
  if (sharedLayoutSync) {
    sharedLayoutSync(els.shell);
    return;
  }
  var winRect = els.shell.getBoundingClientRect();
  if (!(winRect.width > 0 && winRect.height > 0)) return;
  var sideInset = 14;
  var contentTop = 34;
  var contentBottom = 70;
  if (els.topbar) {
    var topbarRect = els.topbar.getBoundingClientRect();
    sideInset = Math.max(8, Math.round(topbarRect.left - winRect.left));
    contentTop = Math.max(0, Math.round(topbarRect.bottom - winRect.top) + 8);
  }
  var backbar = els.shell.querySelector('.stijlCanvasBackbar');
  if (backbar && typeof backbar.getBoundingClientRect === 'function') {
    var backbarRect = backbar.getBoundingClientRect();
    contentBottom = Math.max(0, Math.round(winRect.bottom - backbarRect.top) - 4);
  }
  els.shell.style.setProperty('--preview-side-inset', sideInset + 'px');
  els.shell.style.setProperty('--preview-content-top', contentTop + 'px');
  els.shell.style.setProperty('--preview-content-bottom', contentBottom + 'px');
  els.wrap.style.top = contentTop + 'px';
  els.wrap.style.bottom = contentBottom + 'px';
  els.wrap.style.height = 'auto';
  els.wrap.style.transform = 'none';
}

function wizardPreviewZoomBounds() {
  var min = PREVIEW_ZOOM_MIN;
  var max = PREVIEW_ZOOM_MAX;
  syncWizardPreviewScale();
  syncWizardPreviewLayout();
  var els = wizardPreviewElements();
  if (!els || !previewWindowIsVisible(els.shell) || !els.wrap || !els.visual) {
    return { min: min, max: max };
  }
  var shellScale = wizardPreviewShellScale();
  var availW = els.wrap.clientWidth || 0;
  var availH = els.wrap.clientHeight || 0;
  var rect = els.visual.getBoundingClientRect();
  var appliedScale = parseFloat(els.visual.style.zoom || '') || 1;
  if (availW > 0 && availH > 0 && rect.width > 0 && rect.height > 0 && appliedScale > 0) {
    var baseW = rect.width / (appliedScale * shellScale);
    var baseH = rect.height / (appliedScale * shellScale);
    if (baseW > 0 && baseH > 0) {
      var fitMax = Math.floor(Math.min(availW / baseW, availH / baseH) * 100 / 5) * 5;
      if (fitMax > 0) max = Math.min(max, fitMax);
    }
  }
  max = Math.max(min, max);
  return { min: min, max: max };
}

function applyWizardPreviewUiState() {
  var els = wizardPreviewElements();
  if (!els) return;
  var isShapeEditing = wizardShapeEditingEnabled();
  var canFlip = previewDoubleSided();
  var backMode = previewBackModeForUi();
  syncWizardPreviewScale();
  syncWizardPreviewLayout();
  var bounds = wizardPreviewZoomBounds();
  state.previewZoom = Math.max(bounds.min, Math.min(bounds.max, Number(state.previewZoom) || PREVIEW_DEFAULT_ZOOM));
  var scale = state.previewZoom / 100;
  if (els.visual) els.visual.style.zoom = scale;
  if (els.zoomPct) els.zoomPct.textContent = state.previewZoom + '%';
  if (els.faceInner) els.faceInner.classList.toggle('flipped', canFlip && !!state.previewFlipped);
  if (els.shell) {
    els.shell.classList.toggle('night', previewNightEnabled());
    els.shell.classList.toggle('is-shape-editing', isShapeEditing);
    els.shell.classList.toggle('grid-on', previewGridEnabled());
    els.shell.classList.remove('grid-accent');
    els.shell.classList.remove('grid-dragging');
  }
  els.flipButtons.forEach(function(button){
    button.classList.toggle('sel', canFlip && !!state.previewFlipped);
  });
  els.backModeButtons.forEach(function(button){
    button.classList.toggle('sel', button.getAttribute('data-preview-back-mode') === backMode);
  });
  els.gridButtons.forEach(function(button){
    var isGrid = previewGridEnabled();
    var label = isGrid ? 'Raster uitzetten' : 'Raster tonen';
    button.classList.toggle('sel', isGrid);
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.innerHTML = previewGridToggleIconHtml();
  });
  els.nightButtons.forEach(function(button){
    var isNight = previewNightEnabled();
    var label = isNight ? 'Nachtmodus uitzetten' : 'Nachtmodus aanzetten';
    button.classList.toggle('sel', isNight);
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.innerHTML = previewNightToggleIconHtml(isNight);
  });
  syncWizardPrimaryShapeDom();
  syncWizardCoverTextDom();
  syncWizardShapeEditorUi();
  syncWizardPreviewLayout();
}

function flashWizardPreviewZoomLimit() {
  var els = wizardPreviewElements();
  if (!els || !els.zoomControl) return;
  els.zoomControl.classList.remove('at-limit');
  void els.zoomControl.offsetWidth;
  els.zoomControl.classList.add('at-limit');
  setTimeout(function(){
    if (els.zoomControl) els.zoomControl.classList.remove('at-limit');
  }, 500);
}

function setWizardPreviewZoom(nextZoom) {
  var bounds = wizardPreviewZoomBounds();
  state.previewZoom = Math.max(bounds.min, Math.min(bounds.max, Math.round(Number(nextZoom) / 5) * 5 || PREVIEW_DEFAULT_ZOOM));
  applyWizardPreviewUiState();
  syncEmbeddedPreview();
}

function stepWizardPreviewZoom(delta) {
  var prev = state.previewZoom;
  setWizardPreviewZoom((state.previewZoom || PREVIEW_DEFAULT_ZOOM) + delta);
  if (state.previewZoom === prev) flashWizardPreviewZoomLimit();
}

function toggleWizardPreviewFlip() {
  var controller = getWizardPreviewBackModeController();
  if (controller && typeof controller.toggleFlip === 'function') {
    controller.toggleFlip();
    return;
  }
  if (!previewDoubleSided()) {
    state.previewFlipped = false;
    applyWizardPreviewUiState();
    syncEmbeddedPreview();
    return;
  }
  state.previewFlipped = !state.previewFlipped;
  applyWizardPreviewUiState();
  syncEmbeddedPreview();
}

function toggleWizardPreviewGrid() {
  state.previewGrid = !state.previewGrid;
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  state.wizardDraft.preview.gridMode = !!state.previewGrid;
  applyWizardPreviewUiState();
  syncEmbeddedPreview();
}

function toggleWizardPreviewNight() {
  state.previewNight = !state.previewNight;
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  state.wizardDraft.preview.nightMode = !!state.previewNight;
  applyWizardPreviewUiState();
  renderPreviewBackground();
  syncEmbeddedPreview();
}

function setWizardPreviewBackEditSurface(surface) {
  if (previewBackMode() !== 'blank') return;
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  state.wizardDraft.preview.backEditSurface = String(surface || '').trim() === 'front' ? 'front' : 'back';
  state.previewBackModeUiOverride = '';
  state.previewBackSurfaceUiOverride = '';
  state.previewBackExtraDelayed = false;
  pushWizardHistory();
  applyWizardPreviewUiState();
  syncEmbeddedPreview();
}

function setWizardPreviewBackScope(scope) {
  if (previewBackMode() !== 'blank') return;
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  state.wizardDraft.preview.backScope = (String(scope || '').trim() === 'card' && previewCanUseCardBackScope()) ? 'card' : 'set';
  state.previewBackModeUiOverride = '';
  state.previewBackSurfaceUiOverride = '';
  state.previewBackExtraDelayed = false;
  pushWizardHistory();
  applyWizardPreviewUiState();
  syncEmbeddedPreview();
}

function rerenderWizardPreviewPanel() {
  var current = root && root.querySelector ? root.querySelector('#wizardPreviewViewport') : null;
  if (!current || !current.parentNode) {
    renderApp(false);
    return;
  }
  clearWizardPreviewModeTimers();
  current.outerHTML = renderPreviewPanel();
  syncWizardPreviewActionApi();
  applyWizardPreviewUiState();
  renderPreviewBackground();
  refreshWizardPreviewContextMenu();
  syncWizardShapeEditorUi();
}

function setWizardPreviewBackMode(mode) {
  var controller = getWizardPreviewBackModeController();
  if (controller && typeof controller.setBackMode === 'function') {
    controller.setBackMode(mode);
    return;
  }
  if (!previewDoubleSided()) return;
  var nextMode = (mode === 'blank' || mode === 'reflect') ? mode : 'mirror';
  if (previewBackMode() === nextMode && state.previewFlipped) return;
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  var prevMode = previewBackMode();
  var prevSurface = previewBackEditSurface();
  var wasFlipped = !!state.previewFlipped;
  var changed = prevMode !== nextMode;
  var spinAdvance = !!(changed && wasFlipped);
  state.wizardDraft.preview.backMode = nextMode;
  state.wizardDraft.preview.backEditSurface = nextMode === 'blank' ? 'back' : 'front';
  if (changed && (!wasFlipped || spinAdvance)) {
    state.previewBackModeUiOverride = prevMode;
    state.previewBackSurfaceUiOverride = (prevMode === 'blank' || nextMode === 'blank') ? prevSurface : '';
  } else {
    state.previewBackModeUiOverride = '';
    state.previewBackSurfaceUiOverride = '';
  }
  state.previewBackExtraDelayed = nextMode === 'blank' && changed && !wasFlipped;
  pushWizardHistory();
  state.previewFlipped = true;
  replaceWizardPreviewBackFaceDom();
  applyWizardPreviewUiState();
  state.previewBackModeUiOverride = '';
  state.previewBackSurfaceUiOverride = '';
  state.previewBackExtraDelayed = false;
  syncEmbeddedPreview();
}

function syncWizardPreviewActionApi() {
  window.PK = window.PK || {};
  window.PK.wizardPreview = {
    stepZoom: stepWizardPreviewZoom,
    resetZoom: function(){ setWizardPreviewZoom(PREVIEW_DEFAULT_ZOOM); },
    navigate: navigateWizardPreview,
    navigateHome: navigateWizardPreviewHome,
    toggleFlip: toggleWizardPreviewFlip,
    toggleGrid: toggleWizardPreviewGrid,
    toggleNight: toggleWizardPreviewNight,
    setBackMode: setWizardPreviewBackMode,
    setBackEditSurface: setWizardPreviewBackEditSurface,
    setBackScope: setWizardPreviewBackScope
  };
}

function wizardPrimaryShapeNodes() {
  return Array.prototype.slice.call(root.querySelectorAll('.stijlCanvasWindow[data-wizard-preview="1"] .cpShape[data-shape-role="primary"]'));
}

function syncWizardShapeEditorUi() {
  var activeLayer = getActiveDesignShapeLayer();
  if (!activeLayer) return;
  var selectionActive = wizardDesignSelectionActive();
  var activeLayerId = String(activeLayer.id || '').trim();
  var activeType = String(activeLayer.type || '').trim();
  root.querySelectorAll('[data-shape-layer-select]').forEach(function(button){
    var selected = !!(selectionActive && String(button.getAttribute('data-shape-layer-select') || '').trim() === activeLayerId);
    button.classList.toggle('sel', selected);
    button.classList.toggle('active', selected);
  });
  root.querySelectorAll('[data-shape-choice]').forEach(function(button){
    var selected = !!(selectionActive && String(button.getAttribute('data-shape-choice') || '').trim() === activeType);
    button.classList.toggle('sel', selected);
  });
  root.querySelectorAll('[data-icon-choice]').forEach(function(button){
    var selected = !!(selectionActive && String(button.getAttribute('data-icon-choice') || '').trim() === String(state.wizardDraft.design.iconPreset || '').trim());
    button.classList.toggle('sel', selected);
  });
  var sizeInput = root.querySelector('[data-shape-size]');
  if (sizeInput) {
    sizeInput.value = String(activeLayer.size);
    sizeInput.style.setProperty('--pct', sliderPercent(activeLayer.size, 12, 120) + '%');
  }
  var sizeLabel = root.querySelector('[data-shape-size-label]');
  if (sizeLabel) sizeLabel.innerHTML = sliderValueHtml(activeLayer.size, '');
  var rotateInput = root.querySelector('[data-shape-rotate]');
  if (rotateInput) {
    rotateInput.value = String(activeLayer.rotate);
    rotateInput.style.setProperty('--pct', sliderPercent(activeLayer.rotate, -180, 180) + '%');
  }
  var rotateLabel = root.querySelector('[data-shape-rotate-label]');
  if (rotateLabel) rotateLabel.innerHTML = sliderValueHtml(activeLayer.rotate, '°');
}

function syncWizardPrimaryShapeDom() {
  var layers = ensureDesignShapeLayers();
  var activeLayer = getActiveDesignShapeLayer();
  var shapeEditing = wizardShapeEditingEnabled();
  wizardPrimaryShapeNodes().forEach(function(node){
    var layerId = String(node.getAttribute('data-layer-id') || '').trim();
    var shape = layers.find(function(item){ return item.id === layerId; }) || activeLayer;
    if (!shape) return;
    var shapeKey = String(node.getAttribute('data-shape-key') || '').trim();
    var size = shapeKey === 'cover' ? shape.size : Math.max(24, Math.round(shape.size * 0.72));
    node.style.left = shape.x + '%';
    node.style.top = shape.y + '%';
    node.style.width = size + '%';
    node.style.height = size + '%';
    node.style.transform = 'translate(-50%,-50%) rotate(' + shape.rotate + 'deg)';
    node.classList.toggle('sel', !!(shapeEditing && activeLayer && shape.id === activeLayer.id));
  });
}

function syncWizardCoverTextDom() {
  var activeIndex = getActiveWizardCoverTextIndex();
  root.querySelectorAll('.stijlCanvasWindow[data-wizard-preview="1"] .cpTextBlock[data-cover-text-idx]').forEach(function(node){
    var idx = parseInt(node.getAttribute('data-cover-text-idx') || '-1', 10);
    node.classList.toggle('active', idx === activeIndex);
  });
}

function bindWizardShapeDragGlobals() {
  if (wizardShapeDragEventsBound) return;
  wizardShapeDragEventsBound = true;
  window.addEventListener('pointermove', function(ev){
    if (!wizardShapeDrag || ev.pointerId !== wizardShapeDrag.pointerId) return;
    moveWizardPrimaryShape(ev.clientX, ev.clientY);
  });
  window.addEventListener('pointerup', finishWizardPrimaryShapeDrag);
  window.addEventListener('pointercancel', finishWizardPrimaryShapeDrag);
  window.addEventListener('pointerdown', function(ev){
    if (!wizardPreviewContextMenu || wizardPreviewContextMenu.classList.contains('hidden')) return;
    if (wizardPreviewContextMenu.contains(ev.target)) return;
    closeWizardPreviewContextMenu();
  });
  window.addEventListener('scroll', closeWizardPreviewContextMenu, true);
  window.addEventListener('resize', closeWizardPreviewContextMenu);
  window.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape') closeWizardPreviewContextMenu();
  });
}

function wireWizardShapeEditing() {
  bindWizardShapeDragGlobals();
  root.querySelectorAll('.stijlCanvasWindow[data-wizard-preview="1"] .cpShape[data-shape-role="primary"]').forEach(function(node){
    if (wizardShapeEditingEnabled()) {
      node.addEventListener('pointerdown', startWizardPrimaryShapeDrag);
    }
    node.addEventListener('contextmenu', function(ev){
      var layerId = String(node.getAttribute('data-layer-id') || '').trim();
      if (!layerId) return;
      setActiveDesignShapeLayer(layerId);
      syncWizardPrimaryShapeDom();
      syncWizardShapeEditorUi();
      openWizardPreviewContextMenu(ev, {
        type: 'shape',
        layerId: layerId,
        index: ensureDesignShapeLayers().findIndex(function(layer){ return layer.id === layerId; })
      });
    });
  });
  root.querySelectorAll('.stijlCanvasWindow[data-wizard-preview="1"] .cpTextBlock[data-cover-text-idx]').forEach(function(node){
    node.addEventListener('click', function(ev){
      var idx = parseInt(node.getAttribute('data-cover-text-idx') || '-1', 10);
      if (idx < 0) return;
      setActiveWizardCoverTextIndex(idx);
      syncWizardCoverTextDom();
      ev.preventDefault();
      ev.stopPropagation();
    });
    node.addEventListener('contextmenu', function(ev){
      var idx = parseInt(node.getAttribute('data-cover-text-idx') || '-1', 10);
      if (idx < 0) return;
      setActiveWizardCoverTextIndex(idx);
      syncWizardCoverTextDom();
      openWizardPreviewContextMenu(ev, {
        type: 'coverText',
        index: idx
      });
    });
  });
}

function moveWizardPrimaryShape(clientX, clientY) {
  if (!wizardShapeDrag || !wizardShapeDrag.layerEl) return;
  var rect = wizardShapeDrag.layerEl.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return;
  var mouseX = ((clientX - rect.left) / rect.width) * 100;
  var mouseY = ((clientY - rect.top) / rect.height) * 100;
  var activeLayer = getActiveDesignShapeLayer();
  if (!activeLayer) return;
  activeLayer.x = clamp(mouseX - wizardShapeDrag.offsetX, -25, 125);
  activeLayer.y = clamp(mouseY - wizardShapeDrag.offsetY, -25, 125);
  syncLegacyShapeFields();
  wizardShapeDrag.moved = true;
  syncWizardPrimaryShapeDom();
}

function startWizardPrimaryShapeDrag(ev) {
  if (!wizardShapeEditingEnabled() || !ev || ev.button !== 0) return;
  var shapeEl = ev.currentTarget;
  var layerEl = shapeEl && shapeEl.closest ? shapeEl.closest('.cpShapeLayer') : null;
  if (!shapeEl || !layerEl) return;
  var layerId = String(shapeEl.getAttribute('data-layer-id') || '').trim();
  if (layerId) {
    setActiveDesignShapeLayer(layerId);
    syncWizardPrimaryShapeDom();
    syncWizardShapeEditorUi();
  }
  var rect = layerEl.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return;
  var shape = currentDesignShapeState();
  var mouseX = ((ev.clientX - rect.left) / rect.width) * 100;
  var mouseY = ((ev.clientY - rect.top) / rect.height) * 100;
  wizardShapeDrag = {
    pointerId: ev.pointerId,
    layerEl: layerEl,
    shapeEl: shapeEl,
    offsetX: mouseX - shape.x,
    offsetY: mouseY - shape.y,
    moved: false
  };
  shapeEl.classList.add('dragging');
  if (typeof shapeEl.setPointerCapture === 'function') {
    try { shapeEl.setPointerCapture(ev.pointerId); } catch (_err) {}
  }
  ev.preventDefault();
  ev.stopPropagation();
}

function finishWizardPrimaryShapeDrag(ev) {
  if (!wizardShapeDrag || (ev && ev.pointerId != null && ev.pointerId !== wizardShapeDrag.pointerId)) return;
  var drag = wizardShapeDrag;
  wizardShapeDrag = null;
  if (drag.shapeEl) {
    drag.shapeEl.classList.remove('dragging');
    if (ev && typeof drag.shapeEl.releasePointerCapture === 'function') {
      try { drag.shapeEl.releasePointerCapture(ev.pointerId); } catch (_err) {}
    }
  }
  if (drag.moved) commitWizardChange(false);
}

function buildCoverTextsHtml(meta) {
  var ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
  var list = Array.isArray(ui.coverTexts) ? ui.coverTexts : [];
  var activeIndex = getActiveWizardCoverTextIndex();
  return list.map(function(item, idx){
    var align = item.align === 'center' ? '-50%' : item.align === 'right' ? '-100%' : '0';
    var color = item.color || '#17313A';
    var bg = item.bg ? '--cp-text-bg:' + esc(item.bg) + ';' : '';
    var weight = item.weight === 'bold' ? '700' : item.weight === 'semibold' ? '600' : item.weight === 'medium' ? '500' : '400';
    return (
      '<div class="cpTextBlock' + (idx === activeIndex ? ' active' : '') + '" data-cover-text-idx="' + idx + '" style="left:' + clamp(item.x, 8, 92) + '%;top:' + clamp(item.y, 12, 88) + '%;transform:translate(' + align + ',-50%)">' +
        '<span class="cpTextBlockText' + (item.bg ? ' hasBg' : '') + '" style="' + bg + 'font-family:\'' + esc(item.font || 'IBM Plex Sans') + '\',sans-serif;color:' + esc(color) + ';font-size:' + clamp(parseInt(item.size, 10) || 16, 10, 34) + 'pt;font-weight:' + weight + ';text-align:' + (item.align || 'left') + ';font-style:' + (item.italic ? 'italic' : 'normal') + ';text-decoration:' + (item.underline ? 'underline' : 'none') + '">' + esc(item.text || '') + '</span>' +
      '</div>'
    );
  }).join('');
}

function buildCardShapeLayers(key, palette, accent) {
  var recipe = backgroundRecipe(palette, accent);
  var isCover = key === 'cover';
  var layers = [];

  Array.prototype.push.apply(layers, buildBackgroundLayers(recipe, isCover));
  Array.prototype.push.apply(layers, buildPrimaryShapeLayers(recipe, isCover));

  var iconLayer = buildIconLayer(recipe, isCover);
  if (iconLayer) layers.push(iconLayer);

  return layers;
}

function backgroundRecipe(inputPalette, inputAccent, presetOverride, cardColorOverride) {
  var palette = inputPalette || getSelectedPalette();
  var accent = inputAccent || getAccentColor();
  var preset = presetOverride || state.wizardDraft.design.backgroundPreset;
  var baseCard = cardColorOverride || effectiveCardColor();
  var primary = String(palette.previewA || mixHex(accent, baseCard, 0.58)).trim();
  var secondary = String(palette.previewB || mixHex(palette.softShape, baseCard, 0.44)).trim();
  var panel = String(palette.basePanel || palette.softShape || '#E6E1D8').trim();
  var soft = mixHex(primary, baseCard, 0.12);
  var deep = mixHex(secondary, accent, 0.12);
  var neutral = mixHex(panel, '#ffffff', 0.18);
  var cardBg = baseCard;
  var paperTint = mixHex(baseCard, panel, 0.24);
  var canvasTint = mixHex(baseCard, secondary, 0.18);

  if (preset === 'paper') cardBg = paperTint;
  if (preset === 'subtle') cardBg = mixHex(baseCard, panel, 0.1);
  if (preset === 'canvas') cardBg = canvasTint;
  if (preset === 'gradient') cardBg = mixHex(baseCard, primary, 0.12);
  if (preset === 'soft-spots') cardBg = mixHex(baseCard, secondary, 0.12);

  return {
    preset: preset,
    cardBg: cardBg,
    soft: soft,
    deep: deep,
    neutral: neutral,
    primary: primary,
    secondary: secondary,
    accent: accent,
    icon: String(palette.defaultIconAccent || mixHex(accent, secondary, 0.22)).trim(),
    stroke: mixHex(accent, '#ffffff', 0.22)
  };
}

function buildBackgroundLayers(recipe, isCover) {
  var preset = recipe.preset;
  if (preset === 'clean') return [];
  if (preset === 'paper') return [];
  if (preset === 'subtle') {
    return [
      Object.assign(blobLayer(18, 18, isCover ? 72 : 56, mixHex(recipe.primary, '#ffffff', 0.06), 0.56, 44, 31), { role: 'background' }),
      Object.assign(roundedLayer(82, 82, isCover ? 74 : 58, mixHex(recipe.secondary, '#ffffff', 0.14), 0.46), { role: 'background' })
    ];
  }
  if (preset === 'canvas') {
    return [Object.assign({
      type: 'imported',
      x: 50,
      y: 50,
      size: 120,
      fill: 'transparent',
      stroke: mixHex(recipe.cardBg, recipe.stroke, 0.74),
      strokeWidth: 1.4,
      strokeOpacity: 0.22,
      importedHasFill: false,
      importedHasStroke: true,
      importMarkup:
        '<path d="M16 24h68M16 38h68M16 52h68M16 66h68"></path>' +
        '<path d="M24 16v68M38 16v68M52 16v68M66 16v68"></path>'
    }, { role: 'background' })];
  }
  if (preset === 'gradient') {
    return [
      Object.assign(circleLayer(24, 22, isCover ? 76 : 58, mixHex(recipe.primary, '#ffffff', 0.08), 0.4), { role: 'background' }),
      Object.assign(archLayer(76, 78, isCover ? 92 : 70, mixHex(recipe.secondary, '#ffffff', 0.18), 0.28), { role: 'background' })
    ];
  }
  if (preset === 'soft-spots') {
    return [
      Object.assign(circleLayer(18, 26, isCover ? 34 : 28, mixHex(recipe.primary, '#ffffff', 0.12), 0.26), { role: 'background' }),
      Object.assign(circleLayer(79, 18, isCover ? 22 : 20, mixHex(recipe.neutral, '#ffffff', 0.1), 0.24), { role: 'background' }),
      Object.assign(blobLayer(75, 78, isCover ? 38 : 30, mixHex(recipe.secondary, '#ffffff', 0.12), 0.2, 24, 12), { role: 'background' })
    ];
  }
  return [];
}

function buildPrimaryShapeLayers(recipe, isCover) {
  var layers = ensureDesignShapeLayers();
  return layers.map(function(layer, index){
    var shapeType = layer.type === 'imported' && layer.importMarkup ? 'imported' : normalizeShapePresetId(layer.type);
    if (shapeType === EMPTY_SHAPE_PRESET_ID) return null;
    var size = isCover ? layer.size : Math.max(24, Math.round(layer.size * 0.72));
    var color = effectiveShapeLayerColor(layer);
    var opacity = Math.max(0, Math.min(1, Number(layer.fillOpacity) || (shapeType === 'wave' ? 0.9 : 0.92)));
    if (shapeType === 'imported') {
      return {
        type: 'imported',
        x: layer.x,
        y: layer.y,
        size: size,
        fill: layer.importedHasFill === false ? 'transparent' : color,
        fillOpacity: opacity,
        stroke: layer.importedHasStroke ? (layer.stroke && layer.stroke !== 'transparent' ? layer.stroke : color) : 'transparent',
        strokeOpacity: Math.max(0, Math.min(1, Number(layer.strokeOpacity) || 1)),
        strokeWidth: Math.max(0, Number(layer.strokeWidth) || 0),
        rotate: layer.rotate || 0,
        importedHasFill: layer.importedHasFill !== false,
        importedHasStroke: !!layer.importedHasStroke,
        importMarkup: layer.importMarkup,
        role: 'primary',
        layerId: layer.id,
        colorMode: layer.colorMode === 'custom' ? 'custom' : 'palette',
        paletteRole: normalizeDesignShapePaletteRole(layer.paletteRole, index)
      };
    }
    return Object.assign(
      shapeLayerOfType(shapeType, layer.x, layer.y, size, color, opacity, layer.rotate),
      {
        role: 'primary',
        layerId: layer.id,
        colorMode: layer.colorMode === 'custom' ? 'custom' : 'palette',
        paletteRole: normalizeDesignShapePaletteRole(layer.paletteRole, index)
      }
    );
  }).filter(Boolean);
}

function buildIconLayer(recipe, isCover) {
  var preset = ICON_PRESETS.find(function(icon){
    return icon.id === state.wizardDraft.design.iconPreset;
  }) || ICON_PRESETS[0];
  if (!preset.markup) return null;
  return {
    type: 'imported',
    x: isCover ? 50 : 50,
    y: isCover ? 79 : 80,
    size: isCover ? 15 : 13,
    fill: preset.fill ? recipe.icon : 'transparent',
    fillOpacity: preset.fill ? 0.94 : 1,
    stroke: recipe.icon,
    strokeWidth: 3,
    strokeOpacity: 0.92,
    importedHasFill: !!preset.fill,
    importedHasStroke: true,
    importMarkup: preset.markup,
    role: 'icon'
  };
}

function shapeLayerOfType(type, x, y, size, color, opacity, rotate) {
  if (type === 'blob') {
    var blob = blobLayer(x, y, size, color, opacity, rotate < 0 ? 54 : 34, rotate < 0 ? 18 : 42);
    blob.rotate = rotate || 0;
    return blob;
  }
  if (type === 'circle') {
    return circleLayer(x, y, size, color, opacity);
  }
  if (type === 'rounded') {
    return roundedLayer(x, y, size, color, opacity);
  }
  if (type === 'arch') {
    return archLayer(x, y, size, color, opacity, rotate || 0);
  }
  if (type === 'wave') {
    return {
      type: 'wave',
      x: x,
      y: y,
      size: size,
      fill: 'transparent',
      fillOpacity: 1,
      stroke: color,
      strokeOpacity: opacity,
      strokeWidth: 2.8,
      rotate: rotate || 0
    };
  }
  return {
    type: type,
    x: x,
    y: y,
    size: size,
    fill: color,
    fillOpacity: opacity,
    stroke: 'transparent',
    strokeWidth: 0,
    rotate: rotate || 0
  };
}

function buildSummaryData() {
  var themeRecords = buildThemeRecords();
  var format = getSelectedFormat();
  var palette = getSelectedPalette();
  return {
    themeCount: themeRecords.length,
    cardCount: countAllQuestions(),
    paletteLabel: palette.label,
    formatLabel: format.label,
    hasInfoPage: !!state.wizardDraft.infoPage.enabled,
    cardsHtml: themeRecords.map(function(record){
      var questionCount = parseQuestionLines(state.wizardDraft.questions[record.id] || '').length;
      var bundle = buildBundleFromDraft('wizard-summary', state.wizardDraft.slug || 'wizard-summary');
      var renderer = window.PK && window.PK.sharedCardRenderer;
      var previewHtml = renderer && typeof renderer.render === 'function'
        ? renderer.render({
            meta: bundle.meta,
            wrapClass: 'wizardSummaryRenderer',
            previewKey: record.key,
            themeKey: record.key,
            frontTxt: '',
            backTxt: '',
            forceNoImage: true,
            suppressEmptyFrontHint: true
          })
        : '';
      return (
        '<div class="wizardSummaryCard">' +
          previewHtml +
          '<div class="wizardSummaryCardTitle">' + esc(record.label) + '</div>' +
          '<div class="wizardSummaryCardMeta">' + questionCount + ' kaart' + (questionCount === 1 ? '' : 'en') + '</div>' +
        '</div>'
      );
    }).join('')
  };
}

function dashboardSetHref(mode) {
  var base = dashboardHomeHref();
  if (!state.createdSet) return base;
  if (String(mode || '').trim().toLowerCase() === 'view') {
    return embeddedPreviewHref() || base;
  }
  return base + '?set=' + encodeURIComponent(state.createdSet.id) + '&mode=' + encodeURIComponent(mode || 'edit');
}

function buildUniqueSlug(input) {
  var base = slugify(input) || 'kaartenset';
  var currentSlug = state.editingSet && state.editingSet.slug ? String(state.editingSet.slug).trim() : '';
  var existing = state.existingSets.map(function(set){
    return String(set && set.slug || '').trim();
  }).filter(function(slug){
    return !!slug && slug !== currentSlug;
  });
  var slug = base;
  var index = 2;
  while (existing.indexOf(slug) >= 0) {
    slug = base + '-' + index;
    index += 1;
  }
  return slug;
}

function applyExistingSet(row) {
  if (!row) return;
  state.editingSet = {
    id: String(row.id || ''),
    slug: String(row.slug || ''),
    sort_order: Number(row.sort_order) || 0
  };
  state.wizardDraft = draftFromSetRow(row);
  state.activeThemeId = (state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1';
  state.designSelectionTouched = false;
  state.previewFlipped = false;
  state.previewGrid = !!(state.wizardDraft.preview && state.wizardDraft.preview.gridMode);
  state.previewNight = !!(state.wizardDraft.preview && state.wizardDraft.preview.nightMode);
  state.previewBackExtraDelayed = false;
  state.previewBackModeUiOverride = '';
  state.previewBackSurfaceUiOverride = '';
  state.slugCustom = true;
  state.slugEditorOpen = false;
  state.createdSet = null;
}

function draftFromSetRow(row) {
  var bundle = row && row.bundle && typeof row.bundle === 'object' ? row.bundle : {};
  var meta = bundle.meta && typeof bundle.meta === 'object' ? bundle.meta : {};
  var paletteId = normalizePresetId(PALETTE_PRESETS, meta.designPreset, 'warm-sand');
  var palette = getPresetById(PALETTE_PRESETS, paletteId, PALETTE_PRESETS[0]);
  var paletteDefaults = getPaletteDefaults(palette);
  var typographyPresetId = normalizePresetId(TYPOGRAPHY_PRESETS, meta.typographyPreset, 'restful');
  var typographyPreset = getPresetById(TYPOGRAPHY_PRESETS, typographyPresetId, TYPOGRAPHY_PRESETS[0]);
  var cssVars = meta.cssVars && typeof meta.cssVars === 'object' ? meta.cssVars : {};
  var ui = meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
  var backStyleData = clonePlainData(ui.backStyle) || { scope: 'set', cssVars: {}, byCard: {} };
  var previewBackScope = String(backStyleData.scope || '').trim() === 'card' ? 'card' : 'set';
  var savedCardBgBaseByKey = ui.cardBgBaseByKey && typeof ui.cardBgBaseByKey === 'object' ? ui.cardBgBaseByKey : {};
  var savedCardBgToneByKey = ui.cardBgToneByKey && typeof ui.cardBgToneByKey === 'object' ? ui.cardBgToneByKey : {};
  var savedCardTone = Number(savedCardBgToneByKey.cover);
  if (!isFinite(savedCardTone)) savedCardTone = 0;
  var indexBackground = clonePlainData(
    (ui.cardsIndex && ui.cardsIndex.background) ||
    (ui.index && ui.index.background) ||
    null
  );
  var infoFields = extractInfoPageFields(meta, bundle);
  var themeDefs = buildThemeDefinitions(meta, bundle);
  var shapeLayers = extractSavedShapeLayers(meta);
  var activeShapeLayer = shapeLayers[0] || defaultDesignShapeLayer({ type: EMPTY_SHAPE_PRESET_ID });
  var questions = {};
  var questionIds = {};
  var themes = themeDefs.map(function(theme, index){
    var themeId = 'theme-' + (index + 1);
    var sourceList = Array.isArray(bundle.questions && bundle.questions[theme.key]) ? bundle.questions[theme.key] : [];
    questions[themeId] = serializeQuestionLines(sourceList);
    questionIds[themeId] = sourceList.map(function(item){
      return String(item && item._qid || '').trim();
    }).filter(Boolean);
    return {
      id: themeId,
      name: theme.label
    };
  });
  if (!themes.length) {
    themes = [{ id: 'theme-1', name: 'Algemeen' }];
    questions['theme-1'] = '';
  }
  return {
    name: String(row.title || meta.title || '').trim(),
    slug: String(row.slug || meta.slug || '').trim(),
    format: normalizePresetId(FORMAT_OPTIONS, row.card_format || meta.cardFormat, 'landscape-85x55'),
    palette: paletteId,
    design: {
      shapePreset: normalizeShapePresetId(activeShapeLayer.type || meta.shapePreset),
      iconPreset: normalizePresetId(ICON_PRESETS, meta.iconPreset, ''),
      accentIndex: 0,
      accentColor: String(cssVars['--pk-set-accent'] || paletteDefaults.accent || '').trim(),
      backgroundPreset: normalizePresetId(BACKGROUND_PRESETS, meta.backgroundPreset, 'clean'),
      shapeX: activeShapeLayer.x,
      shapeY: activeShapeLayer.y,
      shapeSize: activeShapeLayer.size,
      shapeRotate: activeShapeLayer.rotate,
      shapeLayers: shapeLayers,
      activeShapeLayerId: activeShapeLayer.id
    },
    colors: {
      cardColor: String(savedCardBgBaseByKey.cover || meta.cardColor || cssVars['--pk-set-card'] || cssVars['--pk-set-bg'] || paletteDefaults.card || '').trim(),
      cardTone: clamp(savedCardTone, -100, 100)
    },
    typography: {
      preset: typographyPresetId,
      titleSize: detectTitleScale(meta),
      textSize: detectBodyScale(cssVars['--pk-font-size']),
      textColor: String(cssVars['--pk-set-text'] || paletteDefaults.text || '').trim(),
      textAlign: detectTextAlign(cssVars),
      textValign: detectTextValign(cssVars),
      textWeight: detectTextWeight(cssVars),
      textItalic: detectTextItalic(cssVars),
      textUnderline: detectTextUnderline(cssVars),
      titleFont: detectTitleFont(meta, typographyPreset.titleFont),
      bodyFont: detectBodyFont(cssVars, typographyPreset.bodyFont),
      titlePt: detectTitlePointSize(meta),
      bodyPt: detectBodyPointSize(cssVars['--pk-font-size'])
    },
    coverTexts: clonePlainData(Array.isArray(ui.coverTexts) ? ui.coverTexts : []),
    themes: themes,
    themeMode: themes.length > 1 ? 'multiple' : 'single',
    questions: questions,
    infoPage: {
      enabled: infoFields.enabled,
      title: infoFields.title,
      intro: infoFields.intro,
      usage: infoFields.usage
    },
    preview: {
      cardsPageBg: readCssVarString(cssVars, '--cardsPageBg') || '',
      setsBaseBg: readCssVarString(cssVars, '--setsBaseBg') || '',
      setsHeaderBg: readCssVarString(cssVars, '--setsHeaderBg') || '',
      indexBackground: indexBackground,
      doubleSided: meta.doubleSided !== false,
      // The wizard should always open from the neutral front-state,
      // regardless of how the set was last edited in the editor.
      backMode: 'mirror',
      backEditSurface: 'front',
      backScope: previewBackScope,
      backStyleData: backStyleData,
      questionIds: questionIds,
      gridMode: !!ui.previewGrid,
      nightMode: !!ui.previewNight
    },
    visibility: normalizeVisibility(row.visibility || meta.visibility || (row.is_public ? 'public' : 'private'))
  };
}

function extractSavedShapeLayers(meta) {
  var coverLayers = meta && meta.ui && meta.ui.cardShapes && Array.isArray(meta.ui.cardShapes.cover)
    ? meta.ui.cardShapes.cover
    : [];
  var primaryLayers = coverLayers.filter(function(layer){
    return layer && layer.role === 'primary';
  });
  if (!primaryLayers.length) {
    primaryLayers = coverLayers.filter(function(layer){
      return layer && layer.type && layer.type !== 'imported' && layer.role !== 'background' && layer.role !== 'icon';
    });
  }
  if (primaryLayers.length) {
    return primaryLayers.slice(0, 6).map(function(layer, index){
      var color = String(
        (layer.fill && layer.fill !== 'transparent' ? layer.fill : '') ||
        (layer.stroke && layer.stroke !== 'transparent' ? layer.stroke : '') ||
        ''
      ).trim();
      var opacity = Number(layer.fillOpacity);
      if (!isFinite(opacity) || opacity <= 0) opacity = Number(layer.strokeOpacity);
      if (!isFinite(opacity) || opacity <= 0) opacity = layer.type === 'wave' ? 0.9 : 0.92;
      return normalizeDesignShapeLayer({
        id: String(layer.layerId || '').trim() || ('shape-' + (index + 1)),
        type: layer.type,
        x: Number(layer.x),
        y: Number(layer.y),
        size: Number(layer.size),
        rotate: Number(layer.rotate),
        colorMode: layer.colorMode === 'custom' ? 'custom' : 'palette',
        paletteRole: normalizeDesignShapePaletteRole(layer.paletteRole, index),
        fill: color,
        fillOpacity: opacity
      }, index);
    });
  }
  var stored = meta && meta.shapePosition && typeof meta.shapePosition === 'object' ? meta.shapePosition : null;
  return [defaultDesignShapeLayer({
    type: normalizeShapePresetId(meta && meta.shapePreset),
    x: stored ? Number(stored.x) : 12,
    y: stored ? Number(stored.y) : 14,
    size: stored ? Number(stored.size) : 66,
    rotate: stored ? Number(stored.rotate) : -8
  })];
}

function extractSavedShapePosition(meta) {
  var stored = meta && meta.shapePosition && typeof meta.shapePosition === 'object' ? meta.shapePosition : null;
  if (stored) {
    return {
      shapeX: clamp(Number(stored.x), -25, 125),
      shapeY: clamp(Number(stored.y), -25, 125),
      shapeSize: clamp(Number(stored.size), 12, 120),
      shapeRotate: clamp(Number(stored.rotate), -180, 180)
    };
  }
  var coverLayers = meta && meta.ui && meta.ui.cardShapes && Array.isArray(meta.ui.cardShapes.cover)
    ? meta.ui.cardShapes.cover
    : [];
  var primary = coverLayers.find(function(layer){
    return layer && layer.role === 'primary';
  }) || coverLayers.find(function(layer){
    return layer && layer.type && layer.type !== 'imported';
  });
  if (!primary) {
    return {
      shapeX: 12,
      shapeY: 14,
      shapeSize: 66,
      shapeRotate: -8
    };
  }
  return {
    shapeX: clamp(Number(primary.x), -25, 125),
    shapeY: clamp(Number(primary.y), -25, 125),
    shapeSize: clamp(Number(primary.size), 12, 120),
    shapeRotate: clamp(Number(primary.rotate), -180, 180)
  };
}

function buildThemeDefinitions(meta, bundle) {
  var defs = [];
  var seen = Object.create(null);
  var sourceThemes = Array.isArray(meta.themes) ? meta.themes : [];
  sourceThemes.forEach(function(theme, index){
    var key = String((theme && theme.key) || '').trim() || ('thema-' + (index + 1));
    if (seen[key]) return;
    seen[key] = true;
    defs.push({
      key: key,
      label: String((theme && theme.label) || humanizeThemeKey(key)).trim()
    });
  });
  Object.keys(bundle && bundle.questions && typeof bundle.questions === 'object' ? bundle.questions : {}).forEach(function(key){
    if (seen[key]) return;
    seen[key] = true;
    defs.push({
      key: key,
      label: humanizeThemeKey(key)
    });
  });
  if (!defs.length) defs.push({ key: 'algemeen', label: 'Algemeen' });
  return defs;
}

function serializeQuestionLines(list) {
  if (!Array.isArray(list)) return '';
  return list.map(function(item){
    var front = String((item && (item.voorkant || item.q)) || '').trim();
    var back = String((item && (item.achterkant || item.back)) || '').trim();
    if (!front) return '';
    return back ? (front + ' | ' + back) : front;
  }).filter(Boolean).join('\n');
}

function extractInfoPageFields(meta, bundle) {
  var introSlides = bundle && bundle.intro && Array.isArray(bundle.intro.slides) ? bundle.intro.slides : [];
  var coverSlide = introSlides[0] || {};
  var coverText = String((bundle && bundle.uitleg && bundle.uitleg.cover) || coverSlide.body || '').trim();
  var parsed = splitInfoBody(coverText);
  var enabled = meta.infoPageEnabled != null
    ? !!meta.infoPageEnabled
    : !!(introSlides.length || coverText || (meta.ui && meta.ui.sheet && meta.ui.sheet.enabled));
  return {
    enabled: enabled,
    title: String(meta.infoPageTitle || coverSlide.title || DEFAULT_INFO_PAGE.title).trim() || DEFAULT_INFO_PAGE.title,
    intro: String(meta.infoPageIntro || parsed.intro || DEFAULT_INFO_PAGE.intro).trim(),
    usage: String(meta.infoPageUsage || parsed.usage || DEFAULT_INFO_PAGE.usage).trim()
  };
}

function splitInfoBody(raw) {
  var text = String(raw || '').trim();
  var marker = 'Hoe gebruik je deze kaarten?';
  if (!text) return { intro: '', usage: '' };
  var markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return { intro: text, usage: '' };
  return {
    intro: text.slice(0, markerIndex).trim(),
    usage: text.slice(markerIndex + marker.length).replace(/^[\s:\-]+/, '').trim()
  };
}

function humanizeThemeKey(key) {
  return String(key || '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, function(letter){
      return letter.toUpperCase();
    }) || 'Algemeen';
}

function normalizePresetId(list, value, fallback) {
  var current = String(value || '').trim();
  return list.some(function(item){
    return item && item.id === current;
  }) ? current : fallback;
}

function getPresetById(list, id, fallback) {
  return list.find(function(item){
    return item && item.id === id;
  }) || fallback;
}

function normalizeHexInput(value) {
  var v = String(value || '').trim();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '';
}

function decodeWizardSvgDataUrl(dataUrl) {
  var raw = String(dataUrl || '');
  var idx = raw.indexOf(',');
  if (idx < 0) return '';
  var head = raw.slice(0, idx);
  var body = raw.slice(idx + 1);
  try {
    if (/;base64/i.test(head)) return decodeURIComponent(escape(atob(body)));
    return decodeURIComponent(body);
  } catch (err) {
    return '';
  }
}

function parseWizardSvgViewBox(root) {
  if (!root) return { minX: 0, minY: 0, width: 100, height: 100 };
  var vb = String(root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every(function(n){ return isFinite(n); })) {
    return { minX: vb[0], minY: vb[1], width: vb[2] || 100, height: vb[3] || 100 };
  }
  var w = parseFloat(root.getAttribute('width') || 100);
  var h = parseFloat(root.getAttribute('height') || 100);
  return { minX: 0, minY: 0, width: isFinite(w) && w > 0 ? w : 100, height: isFinite(h) && h > 0 ? h : 100 };
}

function parseWizardImportedSvgColor(value, fallback) {
  var raw = String(value || '').trim();
  if (!raw || raw === 'none') return raw === 'none' ? 'transparent' : fallback;
  var hex = normalizeHexInput(raw);
  if (hex) return hex;
  if (/^rgba?\(/i.test(raw) || /^hsla?\(/i.test(raw)) return raw;
  if (/^currentColor$/i.test(raw)) return fallback;
  return fallback;
}

function stripWizardImportedSvgAttrs(node) {
  if (!node || !node.getAttributeNames) return;
  ['id', 'class', 'style', 'opacity', 'vector-effect', 'color'].forEach(function(attr){
    if (node.hasAttribute(attr)) node.removeAttribute(attr);
  });
}

function importedWizardSvgDrawableNodes(root) {
  if (!root || !root.querySelectorAll) return [];
  return Array.prototype.slice.call(root.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line'));
}

function inspectWizardImportedSvgPaint(root) {
  var nodes = importedWizardSvgDrawableNodes(root);
  var meta = { hasFill: false, hasStroke: false, strokeWidth: 0 };
  nodes.forEach(function(node){
    var fill = parseWizardImportedSvgColor(node.getAttribute('fill'), '#CFE6DF');
    var stroke = parseWizardImportedSvgColor(node.getAttribute('stroke'), 'transparent');
    var sw = parseFloat(node.getAttribute('stroke-width') || 0);
    if (fill && fill !== 'transparent') meta.hasFill = true;
    if (stroke && stroke !== 'transparent') {
      meta.hasStroke = true;
      if (isFinite(sw) && sw > 0) meta.strokeWidth = Math.max(meta.strokeWidth, sw);
    }
  });
  if (!meta.hasFill && !meta.hasStroke) {
    meta.hasStroke = true;
    meta.strokeWidth = meta.strokeWidth || 1.8;
  }
  if (!meta.strokeWidth) meta.strokeWidth = 1.8;
  return meta;
}

function sanitizeWizardImportedSvgNode(node) {
  if (!node || node.nodeType !== 1) return;
  stripWizardImportedSvgAttrs(node);
  var tag = String(node.tagName || '').toLowerCase();
  if (/^(script|foreignobject|iframe|object|embed|link|style)$/i.test(tag)) {
    node.remove();
    return;
  }
  var isDrawable = /^(path|rect|circle|ellipse|polygon|polyline|line)$/.test(tag);
  if (isDrawable) {
    var fill = parseWizardImportedSvgColor(node.getAttribute('fill'), '#CFE6DF');
    var stroke = parseWizardImportedSvgColor(node.getAttribute('stroke'), 'transparent');
    var strokeWidth = parseFloat(node.getAttribute('stroke-width') || 0);
    var fillVisible = !!(fill && fill !== 'transparent');
    var strokeVisible = !!(stroke && stroke !== 'transparent');
    if (!fillVisible && !strokeVisible) {
      strokeVisible = true;
      strokeWidth = strokeWidth || 1.8;
    }
    node.setAttribute('fill', fillVisible ? 'var(--shape-fill, currentColor)' : 'none');
    if (fillVisible) node.setAttribute('fill-opacity', 'var(--shape-fill-opacity, 1)');
    else node.removeAttribute('fill-opacity');
    node.setAttribute('stroke', strokeVisible ? 'var(--shape-stroke, currentColor)' : 'none');
    if (strokeVisible) {
      node.setAttribute('stroke-width', 'var(--shape-stroke-width, ' + ((isFinite(strokeWidth) && strokeWidth > 0) ? strokeWidth : 1.8) + ')');
      node.setAttribute('stroke-opacity', 'var(--shape-stroke-opacity, 1)');
      node.setAttribute('stroke-linecap', node.getAttribute('stroke-linecap') || 'round');
      node.setAttribute('stroke-linejoin', node.getAttribute('stroke-linejoin') || 'round');
    } else {
      node.removeAttribute('stroke-width');
      node.removeAttribute('stroke-opacity');
      node.removeAttribute('stroke-linecap');
      node.removeAttribute('stroke-linejoin');
    }
  }
  Array.prototype.slice.call(node.children || []).forEach(sanitizeWizardImportedSvgNode);
}

function serializeWizardImportedSvgRoot(root, viewBox) {
  if (!root) return '';
  var clone = root.cloneNode(true);
  sanitizeWizardImportedSvgNode(clone);
  var markup = Array.prototype.slice.call(clone.childNodes || []).map(function(node){
    return (new XMLSerializer()).serializeToString(node);
  }).join('');
  var vb = viewBox || { minX: 0, minY: 0, width: 100, height: 100 };
  var sx = 100 / (Number(vb.width) || 100);
  var sy = 100 / (Number(vb.height) || 100);
  var tx = -(Number(vb.minX) || 0) * sx;
  var ty = -(Number(vb.minY) || 0) * sy;
  return '<g transform="matrix(' + sx + ' 0 0 ' + sy + ' ' + tx + ' ' + ty + ')">' + markup + '</g>';
}

function extractWizardImportedSvgAsLayer(dataUrl) {
  var svgText = decodeWizardSvgDataUrl(dataUrl);
  if (!svgText) return null;
  var doc = (new DOMParser()).parseFromString(svgText, 'image/svg+xml');
  var rootNode = doc.documentElement;
  if (!rootNode || rootNode.nodeName.toLowerCase() === 'parsererror' || rootNode.nodeName.toLowerCase() !== 'svg') return null;
  var paint = inspectWizardImportedSvgPaint(rootNode);
  var markup = serializeWizardImportedSvgRoot(rootNode, parseWizardSvgViewBox(rootNode));
  if (!markup) return null;
  return defaultDesignShapeLayer({
    type: 'imported',
    label: 'SVG',
    importMarkup: markup,
    importedHasFill: !!paint.hasFill,
    importedHasStroke: !!paint.hasStroke,
    fill: paint.hasFill ? '#CFE6DF' : 'transparent',
    stroke: paint.hasStroke ? '#5f8894' : 'transparent',
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWidth: paint.hasStroke ? paint.strokeWidth : 0,
    size: 42,
    x: 50,
    y: 50,
    rotate: 0
  });
}

function addWizardImportedShape(dataUrl) {
  var imported = extractWizardImportedSvgAsLayer(dataUrl);
  if (!imported) {
    state.error = 'SVG kon niet worden toegevoegd.';
    renderApp(false);
    return false;
  }
  var layers = ensureDesignShapeLayers();
  if (layers.length >= 6) {
    state.error = 'Maximaal 6 vormen.';
    renderApp(false);
    return false;
  }
  layers.push(imported);
  state.wizardDraft.design.activeShapeLayerId = imported.id;
  syncLegacyShapeFields();
  commitWizardChange(false);
  return true;
}

function importWizardShapeSvgFile(input) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  if (!/\.svg$/i.test(file.name || '') && file.type !== 'image/svg+xml') {
    state.error = 'Alleen SVG-bestanden kunnen worden toegevoegd.';
    if (input) input.value = '';
    renderApp(false);
    return;
  }
  var reader = new FileReader();
  reader.onload = function(){
    addWizardImportedShape(String(reader.result || ''));
    if (input) input.value = '';
  };
  reader.onerror = function(){
    state.error = 'SVG kon niet worden gelezen.';
    if (input) input.value = '';
    renderApp(false);
  };
  reader.readAsDataURL(file);
}

function sameColorHex(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function getPaletteDefaults(input) {
  var palette = null;
  if (typeof input === 'string') {
    palette = isCustomPaletteId(input)
      ? buildCustomPaletteFromState()
      : getPresetById(PALETTE_PRESETS, normalizePresetId(PALETTE_PRESETS, input, 'warm-sand'), PALETTE_PRESETS[0]);
  } else {
    palette = input || getSelectedPalette();
  }
  return {
    accent: String(palette.defaultAccent || '#2F5F63').trim(),
    card: String(palette.baseCard || '#FFFFFF').trim(),
    text: String(palette.defaultText || '#3C4650').trim()
  };
}

function detectTitleScale(meta) {
  var coverTexts = meta && meta.ui && Array.isArray(meta.ui.coverTexts) ? meta.ui.coverTexts : [];
  var title = coverTexts[0] || {};
  var size = Number(title.size) || 0;
  if (size >= 30) return 'groot';
  if (size > 0 && size <= 22) return 'klein';
  return 'normaal';
}

function detectBodyScale(fontSize) {
  var value = parseFloat(String(fontSize || '').replace(/[^\d.]+/g, ''));
  if (value >= 19) return 'ruim';
  if (value > 0 && value <= 15) return 'compact';
  return 'normaal';
}

function detectTitleFont(meta, fallbackFont) {
  var coverTexts = meta && meta.ui && Array.isArray(meta.ui.coverTexts) ? meta.ui.coverTexts : [];
  var title = coverTexts[0] || {};
  return normalizeTypographyFont(title.font, fallbackFont || TYPOGRAPHY_PRESETS[0].titleFont);
}

function detectBodyFont(cssVars, fallbackFont) {
  return normalizeTypographyFont(cssVars && cssVars['--pk-font'], fallbackFont || TYPOGRAPHY_PRESETS[0].bodyFont);
}

function detectTitlePointSize(meta) {
  var coverTexts = meta && meta.ui && Array.isArray(meta.ui.coverTexts) ? meta.ui.coverTexts : [];
  var title = coverTexts[0] || {};
  return String(clampTypographyPoint(title.size, 21, 14, 42));
}

function detectBodyPointSize(fontSize) {
  return String(clampTypographyPoint(fontSize, 12, 10, 28));
}

function detectTextAlign(cssVars) {
  var value = String(cssVars && cssVars['--pk-text-align'] || '').trim();
  return value === 'left' || value === 'right' ? value : 'center';
}

function detectTextValign(cssVars) {
  var value = String(cssVars && cssVars['--pk-text-valign'] || '').trim();
  return value === 'top' || value === 'bottom' ? value : 'center';
}

function detectTextWeight(cssVars) {
  var value = String(cssVars && cssVars['--pk-font-weight'] || '').trim();
  return value === 'medium' || value === 'semibold' || value === 'bold' ? value : 'regular';
}

function detectTextItalic(cssVars) {
  return String(cssVars && cssVars['--pk-font-italic'] || '').trim() === '1';
}

function detectTextUnderline(cssVars) {
  return String(cssVars && cssVars['--pk-font-underline'] || '').trim() === '1';
}

function normalizeVisibility(value) {
  var current = String(value || '').trim();
  return current === 'public' || current === 'unlisted' ? current : 'private';
}

function buildFormatMiniRect(width, height, className) {
  var maxW = 52;
  var maxH = 34;
  var ratio = width / height;
  var rectW = maxW;
  var rectH = Math.round(rectW / ratio);
  if (rectH > maxH) {
    rectH = maxH;
    rectW = Math.round(rectH * ratio);
  }
  return '<div class="' + className + '" style="width:' + rectW + 'px;height:' + rectH + 'px"></div>';
}

function renderMiniShapeSvg(type) {
  if (normalizeShapePresetId(type) === EMPTY_SHAPE_PRESET_ID) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M28 50h44" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"></path></svg>';
  }
  var normalized = normalizeShapePresetId(type);
  var transform = miniShapeTransform(normalized);
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><g' + (transform ? ' transform="' + transform + '"' : '') + '>' + miniShapeMarkup(normalized) + '</g></svg>';
}

function renderMiniShapeLayerSvg(layer) {
  if (layer && layer.type === 'imported' && layer.importMarkup) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" class="wizardMiniImportedShape" style="--shape-fill:currentColor;--shape-stroke:currentColor;--shape-fill-opacity:1;--shape-stroke-opacity:1;--shape-stroke-width:4;">' + layer.importMarkup + '</svg>';
  }
  return renderMiniShapeSvg(layer && layer.type);
}

function renderMiniIconSvg(icon) {
  if (!icon || !icon.markup) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 50h40" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"></path></svg>';
  }
  return '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">' + icon.markup + '</svg>';
}

function miniShapeTransform(type) {
  var scaleMap = {
    leaf: 0.84,
    corner: 0.82,
    cloud: 0.88,
    wave: 0.84,
    slope: 0.86,
    hill: 0.86,
    band: 0.88,
    arch: 0.88,
    cornerwide: 0.88
  };
  var scale = scaleMap[type] || 1;
  if (scale === 1) return '';
  return 'translate(50 50) scale(' + scale + ') translate(-50 -50)';
}

function miniShapeMarkup(type) {
  var fillType = normalizeShapePresetId(type);
  var pathMarkup = '';
  if (fillType === 'blob') pathMarkup = '<path d="M17 46c0-19 13-32 31-32 12 0 19 4 27 3 10-1 18 7 18 18 0 8-4 14-3 21 2 14-6 24-21 24-11 0-15-6-24-6-9 0-14 7-23 7-12 0-22-10-22-24 0-6 3-9 3-11z"></path>';
  else if (fillType === 'circle') pathMarkup = '<circle cx="50" cy="50" r="42"></circle>';
  else if (fillType === 'rounded') pathMarkup = '<rect x="20" y="20" width="60" height="60" rx="14" ry="14"></rect>';
  else if (fillType === 'column') pathMarkup = '<rect x="28" y="6" width="44" height="88" rx="22" ry="22"></rect>';
  else if (fillType === 'side') pathMarkup = '<path d="M24 18h27c23 0 41 14 41 32S74 82 51 82H24C14 82 8 68 8 50s6-32 16-32z"></path>';
  else if (fillType === 'star') pathMarkup = '<path d="M50 8l10 24 26 2-20 17 6 25-22-13-22 13 6-25-20-17 26-2 10-24z"></path>';
  else if (fillType === 'band') pathMarkup = '<path d="M0 34c12-4 24-6 36-6 14 0 26 4 38 8 10 3 18 5 26 4v22c-8 1-16-1-26-4-12-4-24-8-38-8-12 0-24 2-36 6V34z"></path>';
  else if (fillType === 'slope') pathMarkup = '<path d="M0 73 100 28v72H0z"></path>';
  else if (fillType === 'cornerwide') pathMarkup = '<path d="M0 0h100v34c-15 8-31 12-48 12C28 46 11 33 0 16z"></path>';
  else if (fillType === 'hill') pathMarkup = '<path d="M0 100c6-24 18-42 36-50 8-4 17-6 26-6 22 0 38 14 46 56H0z"></path>';
  else if (fillType === 'diamond') pathMarkup = '<path d="M50 8l34 42-34 42L16 50 50 8z"></path>';
  else if (fillType === 'triangle') pathMarkup = '<path d="M50 12l38 74H12z"></path>';
  else if (fillType === 'arrow') pathMarkup = '<path d="M10 42h44v-14l28 22-28 22v-14H10z"></path>';
  else if (fillType === 'cloud') pathMarkup = '<path d="M26 71c-11 0-20-8-20-18 0-9 7-17 16-18 3-12 14-20 27-20 10 0 19 4 25 11 3-1 5-1 8-1 12 0 22 10 22 22s-10 24-22 24H26Z"></path>';
  else if (fillType === 'bar') pathMarkup = '<rect x="16" y="34" width="68" height="32"></rect>';
  else if (fillType === 'pill') pathMarkup = '<rect x="10" y="28" width="80" height="44" rx="22" ry="22"></rect>';
  else if (fillType === 'spark') pathMarkup = '<path d="M50 8l8 24 24 8-24 8-8 24-8-24-24-8 24-8 8-24z"></path>';
  else if (fillType === 'wave') pathMarkup = '<path d="M2 54c10-14 20-20 30-20 10 0 18 8 26 8 8 0 16-8 26-8 10 0 20 6 30 20"></path>';
  else if (fillType === 'arch') pathMarkup = '<path d="M0 100c0-46 24-76 50-76s50 30 50 76z"></path>';
  else if (fillType === 'leaf') pathMarkup = '<path d="M18 57c0-26 18-44 45-44 16 0 25 5 32 13 8 8 12 19 12 31 0 27-19 43-45 43S18 85 18 57z"></path>';
  else if (fillType === 'corner') pathMarkup = '<path d="M0 0h100v64c-14 6-28 9-40 9C26 73 10 55 0 28z"></path>';
  else if (fillType === 'crescent') pathMarkup = '<path d="M64 12c-7 4-16 15-16 35 0 23 13 37 29 41-6 3-12 4-18 4-25 0-45-20-45-45S34 2 59 2c2 0 4 0 5 .3z"></path>';
  else if (fillType === 'burst') pathMarkup = '<path d="M50 8l8 17 18-8-8 18 17 8-17 8 8 18-18-8-8 17-8-17-18 8 8-18-17-8 17-8-8-18 18 8 8-17z"></path>';
  else if (fillType === 'petal') pathMarkup = '<path d="M50 12c12 0 22 10 22 22 0 8-4 13-8 18-5 5-9 12-14 20-5-8-9-15-14-20-4-5-8-10-8-18 0-12 10-22 22-22z"></path>';
  else if (fillType === 'drop') pathMarkup = '<path d="M50 8c15 19 26 33 26 47 0 16-12 29-26 29S24 71 24 55c0-14 11-28 26-47z"></path>';
  else if (fillType === 'hexagon') pathMarkup = '<path d="M50 6L89 27v46L50 94 11 73V27z"></path>';
  else if (fillType === 'octagon') pathMarkup = '<path d="M34 6h32l24 24v40L66 94H34L10 70V30z"></path>';
  else if (fillType === 'heart') pathMarkup = '<path d="M50 88C25 70 4 52 4 34 4 20 14 10 28 10c9 0 17 5 22 12C55 15 63 10 72 10c14 0 24 10 24 24 0 18-21 36-46 54z"></path>';
  else if (fillType === 'shield') pathMarkup = '<path d="M50 6C34 6 14 14 14 14v36c0 22 16 34 36 40 20-6 36-18 36-40V14S66 6 50 6z"></path>';
  else if (fillType === 'oval') pathMarkup = '<ellipse cx="50" cy="50" rx="42" ry="30"></ellipse>';
  else if (fillType === 'parallelogram') pathMarkup = '<path d="M22 20h64l-8 60H14z"></path>';
  else pathMarkup = '<path d="M17 46c0-19 13-32 31-32 12 0 19 4 27 3 10-1 18 7 18 18 0 8-4 14-3 21 2 14-6 24-21 24-11 0-15-6-24-6-9 0-14 7-23 7-12 0-22-10-22-24 0-6 3-9 3-11z"></path>';
  return pathMarkup;
}

function backgroundPreviewStyle(id, palette, accent) {
  var recipe = backgroundRecipe(palette, accent, id);
  if (id === 'clean') return 'background:' + recipe.cardBg;
  if (id === 'paper') return 'background:linear-gradient(180deg,' + recipe.cardBg + ',' + mixHex(recipe.cardBg, '#ffffff', 0.12) + ');';
  if (id === 'subtle') return 'background:radial-gradient(circle at top left,' + mixHex(recipe.soft, '#ffffff', 0.12) + ', transparent 50%),' + recipe.cardBg;
  if (id === 'canvas') return 'background:linear-gradient(90deg,' + hexToRgba(mixHex(recipe.accent, '#ffffff', 0.52), 0.16) + ' 1px, transparent 1px),linear-gradient(180deg,' + hexToRgba(mixHex(recipe.accent, '#ffffff', 0.52), 0.16) + ' 1px, transparent 1px),' + recipe.cardBg + ';background-size:12px 12px,12px 12px,auto;';
  if (id === 'gradient') return 'background:linear-gradient(135deg,' + recipe.cardBg + ',' + mixHex(recipe.accent, '#ffffff', 0.66) + ');';
  return 'background:radial-gradient(circle at 25% 24%,' + mixHex(recipe.soft, '#ffffff', 0.04) + ', transparent 30%),radial-gradient(circle at 78% 76%,' + mixHex(recipe.deep, '#ffffff', 0.38) + ', transparent 26%),' + recipe.cardBg + ';';
}

function applyPaletteChoice(paletteId) {
  if (isCustomPaletteId(paletteId)) {
    state.wizardDraft.palette = CUSTOM_PALETTE_ID;
    return;
  }
  state.wizardDraft.palette = normalizePresetId(PALETTE_PRESETS, paletteId, state.wizardDraft.palette || 'warm-sand');
  var defaults = getPaletteDefaults(state.wizardDraft.palette);
  state.wizardDraft.design.accentIndex = 0;
  state.wizardDraft.design.accentColor = defaults.accent;
  state.wizardDraft.colors = state.wizardDraft.colors || {};
  state.wizardDraft.colors.cardColor = defaults.card;
  state.wizardDraft.typography.textColor = defaults.text;
  syncDesignShapeLayersToPalette();
  syncWizardManualBackgroundPalette();
}

function normalizeShapePresetId(value) {
  var input = String(value || '').trim();
  if (!input || input === EMPTY_SHAPE_PRESET_ID) return EMPTY_SHAPE_PRESET_ID;
  var alias = {
    'soft-blob': 'blob',
    'wave-band': 'wave',
    'round-echo': 'circle',
    'oval-drift': 'oval',
    'corner-arc': 'cornerwide',
    'arch-frame': 'arch',
    'organic-leaf': 'leaf',
    'pill-band': 'pill'
  };
  var next = alias[input] || input;
  return normalizePresetId(SHAPE_PRESETS, next, EMPTY_SHAPE_PRESET_ID);
}

function getShapeLabel(shapeId) {
  if (shapeId === 'imported') return 'SVG';
  if (normalizeShapePresetId(shapeId) === EMPTY_SHAPE_PRESET_ID) return 'Geen vorm';
  var item = getPresetById(SHAPE_PRESETS, normalizeShapePresetId(shapeId), SHAPE_PRESETS[0]);
  return String(item && item.label || 'Vorm');
}

function filteredDesignIcons() {
  var query = String(state.iconSearchQuery || '').trim().toLowerCase();
  if (!query) return ICON_PRESETS;
  return ICON_PRESETS.filter(function(icon){
    var haystack = [icon.id, icon.label, icon.tags || ''].join(' ').toLowerCase();
    return haystack.indexOf(query) >= 0;
  });
}

function getSelectedPalette() {
  if (isCustomPaletteId(state.wizardDraft.palette)) return buildCustomPaletteFromState();
  return PALETTE_PRESETS.find(function(palette){
    return palette.id === state.wizardDraft.palette;
  }) || PALETTE_PRESETS[0];
}

function getSelectedFormat() {
  return FORMAT_OPTIONS.find(function(format){
    return format.id === state.wizardDraft.format;
  }) || FORMAT_OPTIONS[0];
}

function getTypographyPreset() {
  return TYPOGRAPHY_PRESETS.find(function(preset){
    return preset.id === state.wizardDraft.typography.preset;
  }) || TYPOGRAPHY_PRESETS[0];
}

function normalizeTypographyFont(value, fallback) {
  var font = String(value || '').trim();
  if (TYPOGRAPHY_FONT_OPTIONS.indexOf(font) >= 0) return font;
  return String(fallback || TYPOGRAPHY_FONT_OPTIONS[0]);
}

function effectiveTitleFont() {
  var preset = getTypographyPreset();
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.titleFont
    ? String(state.wizardDraft.typography.titleFont).trim()
    : '';
  return normalizeTypographyFont(stored, preset.titleFont);
}

function effectiveBodyFont() {
  var preset = getTypographyPreset();
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.bodyFont
    ? String(state.wizardDraft.typography.bodyFont).trim()
    : '';
  return normalizeTypographyFont(stored, preset.bodyFont);
}

function clampTypographyPoint(value, fallback, min, max) {
  var parsed = parseInt(String(value || '').replace(/[^\d-]+/g, ''), 10);
  if (!isFinite(parsed)) parsed = fallback;
  return clamp(parsed, min, max);
}

function legacyTitleScaleValue() {
  var value = state.wizardDraft.typography.titleSize;
  if (value === 'klein') return 18;
  if (value === 'groot') return 24;
  return 21;
}

function legacyBodyScaleValue() {
  var value = state.wizardDraft.typography.textSize;
  if (value === 'compact') return 11;
  if (value === 'ruim') return 14;
  return 12;
}

function effectiveTitlePt() {
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.titlePt
    ? state.wizardDraft.typography.titlePt
    : '';
  return clampTypographyPoint(stored, legacyTitleScaleValue(), 14, 42);
}

function effectiveBodyPt() {
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.bodyPt
    ? state.wizardDraft.typography.bodyPt
    : '';
  return clampTypographyPoint(stored, legacyBodyScaleValue(), 10, 28);
}

function applyTypographyPresetChoice(presetId) {
  var preset = getPresetById(TYPOGRAPHY_PRESETS, presetId, TYPOGRAPHY_PRESETS[0]);
  state.wizardDraft.typography.preset = preset.id;
  state.wizardDraft.typography.titleFont = preset.titleFont;
  state.wizardDraft.typography.bodyFont = preset.bodyFont;
}

function getAccentColor() {
  var palette = getSelectedPalette();
  var stored = state.wizardDraft.design && state.wizardDraft.design.accentColor
    ? String(state.wizardDraft.design.accentColor).trim()
    : '';
  if (stored) return stored;
  var defaults = getPaletteDefaults(palette);
  return defaults.accent;
}

function currentDesignShapeState() {
  var layer = getActiveDesignShapeLayer() || {};
  var stateShape = {
    id: String(layer.id || '').trim(),
    type: layer.type === 'imported' && layer.importMarkup ? 'imported' : normalizeShapePresetId(layer.type),
    x: clamp(Number(layer.x), -25, 125),
    y: clamp(Number(layer.y), -25, 125),
    size: clamp(Number(layer.size), 12, 120),
    rotate: clamp(Number(layer.rotate), -180, 180),
    paletteRole: normalizeDesignShapePaletteRole(layer.paletteRole, 0),
    fill: String(layer.fill || '').trim(),
    fillOpacity: Math.max(0, Math.min(1, Number(layer.fillOpacity) || 0.92)),
    fillTone: isFinite(Number(layer.fillTone)) ? clamp(Number(layer.fillTone), -100, 100) : 0
  };
  if (stateShape.type === 'imported') {
    stateShape.label = String(layer.label || 'SVG').trim() || 'SVG';
    stateShape.importMarkup = String(layer.importMarkup || '').trim();
    stateShape.importedHasFill = layer.importedHasFill !== false;
    stateShape.importedHasStroke = !!layer.importedHasStroke;
    stateShape.stroke = String(layer.stroke || 'transparent').trim();
    stateShape.strokeOpacity = Math.max(0, Math.min(1, Number(layer.strokeOpacity) || 1));
    stateShape.strokeWidth = Math.max(0, Number(layer.strokeWidth) || 0);
  }
  return stateShape;
}

function effectiveShapeLayerColor(layer) {
  var recipe = backgroundRecipe(getSelectedPalette(), getAccentColor(), state.wizardDraft.design.backgroundPreset, effectiveCardColor());
  var color = layer && layer.fill ? String(layer.fill).trim() : '';
  var paletteColor = paletteColorForDesignRole(layer && layer.paletteRole, recipe);
  var tone = layer && isFinite(Number(layer.fillTone)) ? clamp(Number(layer.fillTone), -100, 100) : 0;
  return applyToneToColor(color || paletteColor, tone);
}

function paletteColorForDesignRole(role, recipe) {
  var key = String(role || '').trim();
  if (key === 'secondary') return String(recipe.secondary || recipe.primary || recipe.accent).trim();
  if (key === 'accent') return String(recipe.accent || recipe.primary).trim();
  if (key === 'neutral') return String(recipe.neutral || recipe.secondary || recipe.primary).trim();
  if (key === 'soft') return String(recipe.soft || recipe.neutral || recipe.primary).trim();
  return String(recipe.primary || recipe.accent).trim();
}

function applyToneToColor(color, tone) {
  var base = normalizeHexInput(color) || color;
  var value = clamp(Number(tone), -100, 100);
  if (!base || !value) return base;
  if (value > 0) return mixHex(base, '#ffffff', Math.min(0.72, value / 100));
  return mixHex(base, '#17313a', Math.min(0.58, Math.abs(value) / 100));
}

function flatUniqueSwatches(rows) {
  var seen = Object.create(null);
  var out = [];
  (Array.isArray(rows) ? rows : []).forEach(function(row){
    if (!Array.isArray(row)) return;
    row.forEach(function(item){
      var color = String(item && item.a || '').trim();
      if (!color) return;
      var key = color.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push({ n: String(item && item.n || color).trim(), a: color });
    });
  });
  return out;
}

function wizardShapeColorRows() {
  var swatches = flatUniqueSwatches(STANDARD_BACKGROUND_ROWS).slice(0, 24);
  return [
    swatches.slice(0, 8),
    swatches.slice(8, 16),
    swatches.slice(16, 24)
  ].filter(function(row){ return row.length; });
}

function effectiveCardColor() {
  var palette = getSelectedPalette();
  var defaults = getPaletteDefaults(palette);
  var stored = state.wizardDraft.colors && state.wizardDraft.colors.cardColor
    ? String(state.wizardDraft.colors.cardColor).trim()
    : '';
  return stored || defaults.card;
}

function effectiveCardTone() {
  var stored = state.wizardDraft.colors ? Number(state.wizardDraft.colors.cardTone) : 0;
  if (!isFinite(stored)) stored = 0;
  return clamp(stored, -100, 100);
}

function effectiveTextColor() {
  if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
    var coverColor = String((ensureWizardCoverTextItem(getActiveWizardCoverTextIndex()) || {}).color || '').trim();
    if (coverColor) return coverColor;
  }
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.textColor
    ? String(state.wizardDraft.typography.textColor).trim()
    : '';
  return stored || getPaletteDefaults(getSelectedPalette()).text;
}

function effectiveTextAlign() {
  var target = normalizeTypographyTarget(state.typographyTarget);
  if (target === 'cover') {
    return String((ensureWizardCoverTextItem(getActiveWizardCoverTextIndex()) || {}).align || 'center').trim() || 'center';
  }
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.textAlign
    ? String(state.wizardDraft.typography.textAlign).trim()
    : '';
  return stored === 'left' || stored === 'right' ? stored : 'center';
}

function effectiveTextValign() {
  var target = normalizeTypographyTarget(state.typographyTarget);
  if (target === 'cover') {
    return String((ensureWizardCoverTextItem(getActiveWizardCoverTextIndex()) || {}).valign || 'center').trim() || 'center';
  }
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.textValign
    ? String(state.wizardDraft.typography.textValign).trim()
    : '';
  return stored === 'top' || stored === 'bottom' ? stored : 'center';
}

function effectiveTextWeight() {
  var target = normalizeTypographyTarget(state.typographyTarget);
  if (target === 'cover') {
    return String((ensureWizardCoverTextItem(getActiveWizardCoverTextIndex()) || {}).weight || 'regular').trim() || 'regular';
  }
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.textWeight
    ? String(state.wizardDraft.typography.textWeight).trim()
    : '';
  return stored === 'medium' || stored === 'semibold' || stored === 'bold' ? stored : 'regular';
}

function effectiveTextItalic() {
  var target = normalizeTypographyTarget(state.typographyTarget);
  if (target === 'cover') return !!((ensureWizardCoverTextItem(getActiveWizardCoverTextIndex()) || {}).italic);
  return !!(state.wizardDraft.typography && state.wizardDraft.typography.textItalic);
}

function effectiveTextUnderline() {
  var target = normalizeTypographyTarget(state.typographyTarget);
  if (target === 'cover') return !!((ensureWizardCoverTextItem(getActiveWizardCoverTextIndex()) || {}).underline);
  return !!(state.wizardDraft.typography && state.wizardDraft.typography.textUnderline);
}

function panelTitleFontValue() {
  if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
    return normalizeTypographyFont((ensureWizardCoverTextItem(0) || {}).font, effectiveTitleFont());
  }
  return effectiveTitleFont();
}

function panelBodyFontValue() {
  if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
    return normalizeTypographyFont((ensureWizardCoverTextItem(1) || {}).font, effectiveBodyFont());
  }
  return effectiveBodyFont();
}

function panelTitlePointValue() {
  if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
    return String(clampTypographyPoint((ensureWizardCoverTextItem(0) || {}).size, effectiveTitlePt(), 14, 42));
  }
  return String(effectiveTitlePt());
}

function panelBodyPointValue() {
  if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
    return String(clampTypographyPoint((ensureWizardCoverTextItem(1) || {}).size, effectiveBodyPt(), 10, 28));
  }
  return String(effectiveBodyPt());
}

function mutateTypographyTarget(mutator) {
  if (typeof mutator !== 'function') return;
  if (normalizeTypographyTarget(state.typographyTarget) === 'cover') {
    mutator(ensureWizardCoverTextItem(getActiveWizardCoverTextIndex() || 0), 'cover');
    return;
  }
  state.wizardDraft.typography = state.wizardDraft.typography || {};
  mutator(state.wizardDraft.typography, 'cards');
}

function setWizardTextAlign(value) {
  var next = value === 'left' || value === 'right' ? value : 'center';
  mutateTypographyTarget(function(target){
    target.align = next;
    target.textAlign = next;
  });
}

function setWizardTextValign(value) {
  var next = value === 'top' || value === 'bottom' ? value : 'center';
  mutateTypographyTarget(function(target){
    target.valign = next;
    target.textValign = next;
  });
}

function setWizardTextWeight(value) {
  var next = value === 'medium' || value === 'semibold' || value === 'bold' ? value : 'regular';
  mutateTypographyTarget(function(target){
    target.weight = next;
    target.textWeight = next;
  });
}

function toggleWizardTextItalic() {
  mutateTypographyTarget(function(target, mode){
    if (mode === 'cover') target.italic = !target.italic;
    else target.textItalic = !target.textItalic;
  });
}

function toggleWizardTextUnderline() {
  mutateTypographyTarget(function(target, mode){
    if (mode === 'cover') target.underline = !target.underline;
    else target.textUnderline = !target.textUnderline;
  });
}

function setWizardTextColor(value) {
  var next = String(value || '').trim();
  if (!next) return;
  mutateTypographyTarget(function(target, mode){
    if (mode === 'cover') target.color = next;
    else target.textColor = next;
  });
}

function coverTitleSizeValue() {
  return effectiveTitlePt();
}

function questionFontSizeValue() {
  return String(effectiveBodyPt());
}

function countAllQuestions() {
  return state.wizardDraft.themes.reduce(function(total, theme){
    return total + parseQuestionLines(state.wizardDraft.questions[theme.id] || '').length;
  }, 0);
}

function labelForScale(value) {
  if (value === 'klein') return 'Klein';
  if (value === 'normaal') return 'Normaal';
  if (value === 'groot') return 'Groot';
  if (value === 'compact') return 'Compact';
  if (value === 'ruim') return 'Ruim';
  return value;
}

function captureFocusState() {
  var active = document.activeElement;
  if (!active || !active.id) return null;
  var selectionStart = null;
  var selectionEnd = null;
  try {
    if (typeof active.selectionStart === 'number') {
      selectionStart = active.selectionStart;
      selectionEnd = active.selectionEnd;
    }
  } catch (_err) {}
  return {
    id: active.id,
    selectionStart: selectionStart,
    selectionEnd: selectionEnd
  };
}

function restoreFocusState(focusState) {
  if (!focusState || !focusState.id) return;
  var next = document.getElementById(focusState.id);
  if (!next) return;
  try {
    next.focus();
    if (typeof focusState.selectionStart === 'number' && typeof next.setSelectionRange === 'function') {
      next.setSelectionRange(focusState.selectionStart, focusState.selectionEnd);
    }
  } catch (_err) {}
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value, min, max) {
  var numeric = Number(value);
  if (!isFinite(numeric)) numeric = min;
  return Math.max(min, Math.min(max, numeric));
}

function hexToRgb(hex) {
  var clean = String(hex || '').replace('#', '');
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function hexToRgba(hex, alpha) {
  var rgb = hexToRgb(hex);
  return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + clamp(alpha, 0, 1) + ')';
}

function mixHex(hexA, hexB, amount) {
  var a = hexToRgb(hexA);
  var b = hexToRgb(hexB);
  var t = clamp(amount, 0, 1);
  return '#' + [a.r, a.g, a.b].map(function(channel, index){
    var next = [b.r, b.g, b.b][index];
    return Math.round(channel + (next - channel) * t).toString(16).padStart(2, '0');
  }).join('');
}

function blobLayer(x, y, size, fill, opacity, deform, seed) {
  return {
    type: 'blob',
    x: x,
    y: y,
    size: size,
    fill: fill,
    fillOpacity: opacity,
    stroke: 'transparent',
    strokeWidth: 0,
    deform: deform || 36,
    blobSeed: seed || 42
  };
}

function circleLayer(x, y, size, fill, opacity) {
  return {
    type: 'circle',
    x: x,
    y: y,
    size: size,
    fill: fill,
    fillOpacity: opacity,
    stroke: 'transparent',
    strokeWidth: 0
  };
}

function roundedLayer(x, y, size, fill, opacity) {
  return {
    type: 'rounded',
    x: x,
    y: y,
    size: size,
    fill: fill,
    fillOpacity: opacity,
    stroke: 'transparent',
    strokeWidth: 0
  };
}

function archLayer(x, y, size, fill, opacity, rotate) {
  return {
    type: 'arch',
    x: x,
    y: y,
    size: size,
    fill: fill,
    fillOpacity: opacity,
    stroke: 'transparent',
    strokeWidth: 0,
    rotate: rotate || 0
  };
}

function iconMarkup(type) {
  if (type === 'check') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"></path></svg>';
  }
  if (type === 'edit') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path></svg>';
  }
  if (type === 'chevron-left') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>';
  }
  if (type === 'chevron-down') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>';
  }
  return '';
}
