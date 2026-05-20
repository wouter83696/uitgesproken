import { supabase, ensureOwnProfile } from './supabase-client.js';
import { resolveCardsIndexBackground, derivePaletteAndShapesFromLayers } from './components/autoBackground.js';

const root = document.getElementById('wizardApp');

const STEP_DEFS = [
  { id: 'name', label: 'Naam', short: 'Naam' },
  { id: 'format', label: 'Vorm', short: 'Vorm' },
  { id: 'design', label: 'Ontwerp', short: 'Ontwerp' },
  { id: 'type', label: 'Typografie', short: 'Typografie' },
  { id: 'questions', label: 'Vragen', short: 'Vragen' },
  { id: 'publish', label: 'Bijna klaar', short: 'Publicatie' },
  { id: 'done', label: 'Klaar', short: 'Klaar' }
];

const DESIGN_SUBSTEPS = [
  { id: 'shapes', label: 'Vormen & iconen', short: 'Vormen' },
  { id: 'colors', label: 'Kleuren', short: 'Kleuren' },
  { id: 'background', label: 'Achtergrond', short: 'Achtergrond' }
];

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
    defaultText: '#2C3E63'
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
let wizardShapeDrag = null;
let wizardShapeDragEventsBound = false;
let wizardShapeLayerSeed = 1;
const SIDEBAR_COLLAPSE_KEY = 'uitgesproken:wizard:sidebar-collapsed';

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
  previewZoom: PREVIEW_DEFAULT_ZOOM,
  previewFlipped: false,
  previewGrid: false,
  previewNight: false,
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
  document.body.classList.toggle('wizardEmbedded', isEmbeddedMode());
  state.sidebarCollapsed = readSidebarCollapsedPreference();
  window.addEventListener('resize', scheduleWizardPreviewRefresh);
  renderLoading();
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
  renderApp();
}

function createDefaultDraft() {
  var initialShapeLayer = defaultDesignShapeLayer();
  return {
    name: '',
    slug: '',
    format: 'landscape-85x55',
    palette: 'warm-sand',
    design: {
      shapePreset: 'blob',
      iconPreset: 'none',
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
      cardColor: ''
    },
    typography: {
      preset: 'restful',
      titleSize: 'normaal',
      textSize: 'normaal',
      textColor: '',
      titleFont: 'DM Serif Display',
      bodyFont: 'IBM Plex Sans',
      titlePt: '21',
      bodyPt: '12'
    },
    coverTexts: null,
    themes: [
      { id: 'theme-1', name: 'Algemeen' }
    ],
    questions: {
      'theme-1': ''
    },
    infoPage: Object.assign({}, DEFAULT_INFO_PAGE),
    preview: {
      cardsPageBg: '',
      setsBaseBg: '',
      setsHeaderBg: '',
      indexBackground: resolveCardsIndexBackground({}),
      backMode: 'mirror',
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

function defaultDesignShapeLayer(overrides) {
  return Object.assign({
    id: nextWizardShapeLayerId(),
    type: 'blob',
    x: 12,
    y: 14,
    size: 66,
    rotate: -8,
    fill: '',
    fillOpacity: 0.92
  }, overrides || {});
}

function normalizeDesignShapeLayer(layer, fallbackIndex) {
  var source = layer && typeof layer === 'object' ? layer : {};
  var id = String(source.id || '').trim() || ('shape-' + (fallbackIndex + 1));
  rememberWizardShapeLayerId(id);
  return {
    id: id,
    type: normalizeShapePresetId(source.type),
    x: clamp(Number(source.x), -25, 125),
    y: clamp(Number(source.y), -25, 125),
    size: clamp(Number(source.size), 12, 120),
    rotate: clamp(Number(source.rotate), -180, 180),
    fill: String(source.fill || '').trim(),
    fillOpacity: Math.max(0, Math.min(1, Number(source.fillOpacity) || 0.92))
  };
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
  syncLegacyShapeFields();
  return match;
}

function syncLegacyShapeFields() {
  var design = state.wizardDraft && state.wizardDraft.design ? state.wizardDraft.design : null;
  if (!design) return;
  var active = Array.isArray(design.shapeLayers)
    ? design.shapeLayers.find(function(layer){ return layer.id === design.activeShapeLayerId; }) || design.shapeLayers[0]
    : null;
  if (!active) return;
  design.shapePreset = normalizeShapePresetId(active.type);
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
    return String(new URLSearchParams(location.search || '').get('set') || '').trim();
  } catch (_err) {
    return '';
  }
}

function isEmbeddedMode() {
  try {
    return (new URLSearchParams(location.search || '').get('embedded') || '') === '1';
  } catch (_err) {
    return false;
  }
}

function embeddedLinkAttrs() {
  return isEmbeddedMode() ? ' target="_top"' : '';
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
  return '/@' + encodeURIComponent(username) + '/' + encodeURIComponent(slug);
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
    }, window.location.origin);
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
}

function currentWizardHistorySnapshot() {
  return {
    wizardDraft: cloneJsonSafe(state.wizardDraft),
    activeThemeId: state.activeThemeId,
    stepIndex: state.stepIndex,
    designSubstep: state.designSubstep,
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
  state.stepIndex = Math.max(0, Math.min(STEP_DEFS.length - 1, parseInt(snapshot.stepIndex, 10) || 0));
  state.designSubstep = normalizeDesignSubstepId(snapshot.designSubstep);
  state.slugEditorOpen = !!snapshot.slugEditorOpen;
  state.slugCustom = !!snapshot.slugCustom;
  state.activeThemeId = String(snapshot.activeThemeId || '').trim() || ((state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1');
  state.previewGrid = !!(state.wizardDraft.preview && state.wizardDraft.preview.gridMode);
  state.previewNight = !!(state.wizardDraft.preview && state.wizardDraft.preview.nightMode);
  if (!state.wizardDraft.themes.some(function(theme){ return theme.id === state.activeThemeId; })) {
    state.activeThemeId = (state.wizardDraft.themes[0] && state.wizardDraft.themes[0].id) || 'theme-1';
  }
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
  if (!e.data || e.data.uitgesproken !== 1 || e.data.type !== 'wizardAction') return;
  var action = String(e.data.action || '').trim();
  if (action === 'undo') {
    undoWizardHistory();
    return;
  }
  if (action === 'redo') {
    redoWizardHistory();
  }
});

function dashboardHomeHref() {
  var slug = state.space && state.space.slug ? String(state.space.slug) : requestedSpaceSlug();
  return slug ? '/' + encodeURIComponent(slug) + '/dashboard/' : '/dashboard/';
}

function dashboardWizardHref(setRef) {
  var ref = String(setRef || '').trim();
  var base = dashboardHomeHref() + 'wizard/';
  return ref ? base + '?set=' + encodeURIComponent(ref) : base;
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
    root.innerHTML = renderEmbeddedLoading();
    return;
  }
  root.innerHTML =
    '<div class="appBoot wizardBoot" role="status" aria-live="polite">' +
      '<div class="appBootInner">' +
        '<div class="appBootLogo">' +
          '<img src="/assets/logo-icons/masters/master-squircle.svg" alt="Uitgesproken">' +
        '</div>' +
        '<div class="appBootWordmark">Uitgesproken</div>' +
        '<div class="appBootSub">Ruimte aan het verkennen...</div>' +
        '<div class="appBootBar" aria-hidden="true">' +
          '<div class="appBootBarFill"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function renderEmbeddedLoading() {
  return (
    '<div class="wizardShell wizardShellUnified wizardShellLoading">' +
      '<section class="wizardFrame wizardFrameLoading">' +
        '<div class="wizardFrameHeader wizardFrameHeaderLoading">' +
          '<div class="wizardFrameTitleGroup">' +
            '<span class="wizardFrameIndex">1</span>' +
            '<div class="wizardFrameHeading">Naam</div>' +
          '</div>' +
          '<div class="wizardFrameDots" aria-hidden="true">' +
            '<span class="wizardFrameDot is-active"></span>' +
            '<span class="wizardFrameDot"></span>' +
            '<span class="wizardFrameDot"></span>' +
            '<span class="wizardFrameDot"></span>' +
            '<span class="wizardFrameDot"></span>' +
            '<span class="wizardFrameDot"></span>' +
            '<span class="wizardFrameDot"></span>' +
          '</div>' +
          '<div class="wizardFrameAside">' +
            '<div class="wizardFrameMeta">Wizard laden...</div>' +
          '</div>' +
        '</div>' +
        '<div class="wizardWorkbench">' +
          '<main class="wizardMainPanel wizardLoadingPanel">' +
            '<div class="wizardStepContent">' +
              '<div class="wizardLoadingLine wizardLoadingLineTitle"></div>' +
              '<div class="wizardLoadingLine wizardLoadingLineWide"></div>' +
              '<div class="wizardLoadingLine wizardLoadingLineWide"></div>' +
              '<div class="wizardLoadingField"></div>' +
              '<div class="wizardLoadingField wizardLoadingFieldShort"></div>' +
            '</div>' +
          '</main>' +
          '<aside class="wizardPreviewPanel wizardLoadingPreviewPanel" aria-label="Preview wordt geladen">' +
            '<div class="wizardPreviewViewport">' +
              '<div class="wizardPreviewScaleFrame">' +
                '<div class="stijlPreviewCol stijlCanvasCenter wizardPreviewCol">' +
                  '<div class="wizardPreviewStage stijlCanvasStage" style="--cardAspect:85/55">' +
                    '<div class="stijlCanvasCardWrap wizardPreviewCardFrame">' +
                      '<div class="stijlCanvasWindow wizardPreviewWindowShell viewer-only-preview wizardLoadingWindow">' +
                        '<div class="wizardLoadingPreviewCard"></div>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</section>' +
    '</div>'
  );
}

function renderApp(preserveFocus) {
  var focusState = preserveFocus ? captureFocusState() : null;
  if (state.booting) {
    renderLoading();
    return;
  }
  if (!state.space) {
    root.innerHTML = renderNoSpaceState();
    return;
  }
  root.innerHTML = renderWizardShell();
  wireEvents();
  if (!state.shellReady) {
    requestAnimationFrame(function(){
      applyWizardPreviewUiState();
      renderPreviewBackground(function(){
        state.shellReady = true;
        revealPreparedWizardPreview();
        var shell = root.querySelector('.wizardShell');
        if (shell) shell.classList.remove('is-preparing');
      });
    });
  } else {
    requestAnimationFrame(function(){
      applyWizardPreviewUiState();
      renderPreviewBackground(revealPreparedWizardPreview);
    });
  }
  syncEmbeddedHeader();
  if (focusState) restoreFocusState(focusState);
}

function revealPreparedWizardPreview() {
  var previewPanel = root.querySelector('.wizardPreviewPanel');
  if (previewPanel) previewPanel.classList.remove('is-preparing');
  var previewShell = root.querySelector('.wizardPreviewWindowShell');
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
  return (
    '<div class="wizardShell wizardShellUnified wizardShellStep-' + stepId + (state.shellReady ? '' : ' is-preparing') + '">' +
      renderTopbar() +
      '<section class="wizardFrame wizardFrameStep-' + stepId + '">' +
        renderFrameHeader() +
        '<div class="wizardWorkbench is-step-' + stepId + '">' +
          '<main class="wizardMainPanel">' +
            renderMainPanel() +
          '</main>' +
          renderPreviewPanel() +
        '</div>' +
        (state.stepIndex === STEP_DEFS.length - 1 ? '' : renderFooter()) +
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
  var showDesignToolbar = isEmbeddedMode() && step.id === 'design';
  if (step.id === 'design' && !showDesignToolbar) heading = step.label + ' · ' + getDesignSubstep().label;
  return (
    '<div class="wizardFrameHeader' + (showDesignToolbar ? ' is-design-toolbar' : '') + '">' +
      '<div class="wizardFrameCluster wizardFrameCluster--menu">' +
        '<div class="wizardFrameTitleGroup">' +
          '<span class="wizardFrameIndex">' + (state.stepIndex + 1) + '</span>' +
          renderFrameStepMenu(heading) +
        '</div>' +
      '</div>' +
      '<div class="wizardFrameCluster wizardFrameCluster--progress">' +
        (showDesignToolbar ? renderEmbeddedDesignToolbar() : (
          '<div class="wizardFrameDots" aria-hidden="true">' +
            STEP_DEFS.map(function(step, index){
              var cls = 'wizardFrameDot';
              if (index === state.stepIndex) cls += ' is-active';
              if (index < state.stepIndex || isStepDone(index)) cls += ' is-done';
              return '<span class="' + cls + '"></span>';
            }).join('') +
          '</div>'
        )) +
      '</div>' +
      '<div class="wizardFrameCluster wizardFrameCluster--nav">' +
        '<div class="wizardFrameAside">' +
          '<div class="wizardFrameMeta">Stap ' + (state.stepIndex + 1) + ' van ' + STEP_DEFS.length + '</div>' +
          (state.stepIndex === STEP_DEFS.length - 1 ? '' : renderNavButtons('wizardHeaderNavActions')) +
        '</div>' +
      '</div>' +
    '</div>'
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
    case 'format':
      return renderFormatStep();
    case 'design':
      return renderDesignStep();
    case 'type':
      return renderTypographyStep();
    case 'questions':
      return renderQuestionsStep();
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
  return (
    '<h1 class="wizardTitle">Hoe heet je kaartenset?</h1>' +
    '<p class="wizardLead">Geef je set een naam. Je kunt dit later nog aanpassen.</p>' +
    '<div class="wizardField">' +
      '<label for="setNameInput">Naam van je kaartenset</label>' +
      '<input id="setNameInput" class="wizardInput" type="text" value="' + esc(draft.name) + '" placeholder="bijv. Diep Luisteren" autocomplete="off">' +
    '</div>' +
    '<div class="wizardSlugRow">' +
      '<div class="wizardSlugLabel">Jouw link</div>' +
      '<div class="wizardSlugShell">' +
        '<span class="wizardSlugPrefix">' + esc(window.location.origin + '/@' + state.username + '/') + '</span>' +
        (
          state.slugEditorOpen
            ? '<input id="slugInput" class="wizardInput" type="text" value="' + esc(draft.slug || '') + '" placeholder="diep-luisteren" style="min-height:42px;padding:10px 14px;font-size:14px;max-width:240px">'
            : '<span class="wizardSlugChip">' + esc(draft.slug || 'jouw-slug') + '</span>'
        ) +
        '<button class="wizardMiniBtn" type="button" data-toggle-slug="1">' +
          iconMarkup('edit') +
          '<span>' + (state.slugEditorOpen ? 'Klaar' : 'Bewerk') + '</span>' +
        '</button>' +
      '</div>' +
    '</div>'
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
  var content = '';
  if (substep.id === 'shapes') content = renderDesignShapesPanel();
  else if (substep.id === 'colors') content = renderDesignColorsPanel();
  else content = renderDesignBackgroundPanel();
  if (isEmbeddedMode()) {
    return (
      '<h1 class="wizardTitle">Ontwerp je kaart</h1>' +
      '<p class="wizardLead">Werk vanuit een rustige functiekolom links en bekijk live wat er rechts gebeurt.</p>' +
      '<div class="wizardDesignSubflow wizardDesignSubflowEmbedded">' +
        content +
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

function renderShapeLayerChipRow() {
  var layers = ensureDesignShapeLayers();
  var active = getActiveDesignShapeLayer();
  return (
    '<div class="shapeLayerBar wizardShapeLayerBar">' +
      layers.map(function(layer, index){
        var selected = active && active.id === layer.id;
        var label = getShapeLabel(layer.type) + ' ' + (index + 1);
        return (
          '<button class="shapeChip' + (selected ? ' sel active' : '') + '" type="button" data-shape-layer-select="' + esc(layer.id) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '">' +
            renderMiniShapeSvg(layer.type) +
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

function renderDesignShapesPanel() {
  var query = String(state.iconSearchQuery || '').trim();
  var searchResults = filteredDesignIcons();
  var quickIcons = DESIGN_ICON_QUICK_IDS.map(function(id){
    return getPresetById(ICON_PRESETS, id, null);
  }).filter(Boolean);
  var activeShape = currentDesignShapeState();
  var activeShapeId = normalizeShapePresetId(activeShape.type);
  var activeIcon = ICON_PRESETS.find(function(icon){
    return icon.id === state.wizardDraft.design.iconPreset;
  }) || ICON_PRESETS[0];
  var quickIconItems = [ICON_PRESETS[0]].concat(quickIcons);
  return (
    '<section class="stijlShapes wizardShapeEditorCard">' +
      '<div class="shapeEditor wizardShapeEditor">' +
        '<div class="shapeActiveWrap wizardShapeActiveWrap">' +
          '<div class="shapeActiveLabel">Actieve vormen</div>' +
          renderShapeLayerChipRow() +
        '</div>' +
        '<div class="shapeGrid wizardShapeEditorGrid">' +
          '<div class="shapeField wizardShapeField">' +
            '<div class="shapeLibraryLabel">Vormen</div>' +
            '<div class="shapeTypeBar wizardDesignShapeGrid">' +
              SHAPE_PRESETS.map(function(shape){
                var selected = activeShapeId === shape.id;
                return (
                  '<button class="shapeTypeBtn' + (selected ? ' sel' : '') + '" type="button" data-shape-choice="' + shape.id + '" title="' + esc(shape.label) + '" aria-label="' + esc(shape.label) + '">' +
                    renderMiniShapeSvg(shape.id) +
                  '</button>'
                );
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="iconLibrary wizardDesignIconLibrary">' +
            '<div class="iconLibraryHead"><div class="shapeLibraryLabel">Iconen</div></div>' +
            '<div class="iconGridMini wizardDesignIconGrid wizardDesignIconQuickRow">' +
              quickIconItems.map(function(icon){
                var selected = state.wizardDraft.design.iconPreset === icon.id;
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
                        var selected = state.wizardDraft.design.iconPreset === icon.id;
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
            '</div>' +
            '<div class="shapeGhost shapeGhostCompact wizardDesignMoveHint">Sleep de actieve vorm in de preview om de plek te bepalen.</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>'
  );
}

function renderSwatchButtons(list, selectedColor, attrName, extraClass) {
  return list.map(function(swatch){
    var color = String(swatch && swatch.a || '').trim();
    if (!color) return '';
    var selected = sameColorHex(selectedColor, color);
    var label = String(swatch && swatch.n || color).trim();
    return '<button class="wizardColorChoice' + (extraClass ? ' ' + extraClass : '') + (selected ? ' is-selected' : '') + '" type="button" ' + attrName + '="' + esc(color) + '" style="background:' + esc(color) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"></button>';
  }).join('');
}

function renderSwatchPicker(rows, selectedColor, attrName, extraClass, summaryText) {
  var safeRows = Array.isArray(rows) ? rows.filter(function(row){
    return Array.isArray(row) && row.length;
  }) : [];
  if (!safeRows.length) return '';
  return (
    '<div class="wizardPalettePicker wizardPalettePickerCompact">' +
      safeRows.map(function(row){
        return '<div class="wizardColorChoices wizardColorChoicesRow wizardColorChoicesGrid">' + renderSwatchButtons(row, selectedColor, attrName, extraClass) + '</div>';
      }).join('') +
    '</div>'
  );
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

function wizardSelectedBackgroundShapes() {
  var bg = ensureWizardBackgroundConfig();
  var list = Array.isArray(bg.blobShapes) ? bg.blobShapes.filter(Boolean) : [];
  if (!list.length && bg.blobSpread) list = [bg.blobSpread];
  return list.length ? list : ['organic'];
}

function wizardToggleBackgroundShape(shapeId) {
  var bg = ensureWizardBackgroundConfig();
  var list = wizardSelectedBackgroundShapes().slice();
  var index = list.indexOf(shapeId);
  if (index >= 0) {
    if (list.length === 1) return;
    list.splice(index, 1);
  } else {
    list.push(shapeId);
  }
  bg.blobShapes = list;
  bg.blobSpread = list[0] || 'organic';
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

function wizardEditableBackgroundPalette() {
  var bg = ensureWizardBackgroundConfig();
  var palette = Array.isArray(bg.palette) ? bg.palette.map(function(color){
    return String(color || '').trim();
  }).filter(Boolean) : [];
  if (!palette.length) palette = wizardManualBackgroundPalette();
  bg.palette = palette.slice();
  return palette;
}

function wizardBackgroundPaletteRows() {
  var swatches = flatUniqueSwatches(STANDARD_BACKGROUND_ROWS);
  var rows = [];
  for (var index = 0; index < swatches.length; index += 12) {
    rows.push(swatches.slice(index, index + 12));
  }
  return rows;
}

function wizardToggleBackgroundPaletteColor(color) {
  var hex = normalizeHexInput(color);
  if (!hex) return;
  var bg = ensureWizardBackgroundConfig();
  var list = wizardEditableBackgroundPalette().slice();
  var key = hex.toLowerCase();
  var existingIndex = list.findIndex(function(entry){
    return String(entry || '').trim().toLowerCase() === key;
  });
  if (existingIndex >= 0) {
    if (list.length === 1) return;
    list.splice(existingIndex, 1);
  } else {
    list.push(hex);
  }
  bg.palette = list;
}

function setWizardBackgroundPaletteCustomColor(color) {
  var hex = normalizeHexInput(color);
  if (!hex) return;
  var bg = ensureWizardBackgroundConfig();
  var list = wizardEditableBackgroundPalette().slice();
  if (!list.some(function(entry){ return sameColorHex(entry, hex); })) list.push(hex);
  bg.palette = list;
}

function renderWizardBackgroundPaletteEditor() {
  var palette = wizardEditableBackgroundPalette();
  var rows = wizardBackgroundPaletteRows();
  var customSeed = normalizeHexInput(palette[palette.length - 1]) || normalizeHexInput(effectiveCardColor()) || '#E4F0E8';
  return (
    '<div class="bgPalActiveWrap">' +
      '<div class="shapeActiveLabel">Actieve kleuren</div>' +
      '<div class="bgPalActiveRow">' +
        palette.map(function(color){
          var normalized = normalizeHexInput(color) || color;
          var light = String(normalized || '').toLowerCase() === '#ffffff';
          return '<button class="brandSw' + (light ? ' brandSwLight' : '') + ' sel" type="button" data-bg-palette-toggle="' + esc(normalized) + '" title="Kleur uit achtergrondpalet verwijderen" style="background:' + esc(normalized) + '"></button>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div class="brandCompact brandCompact-shared wizardBgBrandCompact">' +
      '<div class="sLbl" style="margin:0 0 4px">Kies kleuren</div>' +
      '<div class="wizardBgBrandRows">' +
        rows.map(function(row){
          return '<div class="wizardBgBrandRow">' +
            row.map(function(item){
              var color = String(item && item.a || '').trim();
              if (!color) return '';
              var selected = palette.some(function(entry){
                return sameColorHex(entry, color);
              });
              var light = String(color || '').toLowerCase() === '#ffffff';
              return '<button class="brandSw' + (light ? ' brandSwLight' : '') + (selected ? ' sel' : '') + '" type="button" data-bg-palette-toggle="' + esc(color) + '" title="' + esc(String(item && item.n || color).trim()) + '" style="background:' + esc(color) + '"></button>';
            }).join('') +
          '</div>';
        }).join('') +
      '</div>' +
      '<label class="brandCustomBtn">' +
        '<span class="brandCustomSw" style="--pick:' + esc(customSeed) + '"></span>' +
        '<span>Eigen kleur</span>' +
        '<input type="color" data-bg-palette-custom="1" value="' + esc(customSeed) + '">' +
      '</label>' +
    '</div>'
  );
}

function wizardAutoBackgroundPalette() {
  var bundle = buildBundleFromDraft('wizard-preview', state.wizardDraft.slug || 'wizard-preview');
  var bg = ensureWizardBackgroundConfig();
  var autoSettings = previewDerivedBackground(bundle, bg);
  return Array.isArray(autoSettings && autoSettings.palette) ? autoSettings.palette.slice() : wizardManualBackgroundPalette();
}

function syncWizardManualBackgroundPalette() {
  var bg = ensureWizardBackgroundConfig();
  bg.palette = wizardManualBackgroundPalette();
}

function renderDesignColorsPanel() {
  var palette = getSelectedPalette();
  var activeShape = currentDesignShapeState();
  return (
    '<div class="bgCtrls wizardDesignControlStack wizardDesignControlStack--colors">' +
      '<section class="ctrlG wizardEditorControlCard wizardColorCard">' +
        '<label class="cgT" for="paletteSelect">Sfeer</label>' +
        '<select id="paletteSelect" class="wizardSelect">' +
          PALETTE_PRESETS.map(function(item){
            var selected = item.id === state.wizardDraft.palette ? ' selected' : '';
            return '<option value="' + esc(item.id) + '"' + selected + '>' + esc(item.label + ' - ' + item.description) + '</option>';
          }).join('') +
        '</select>' +
        '<div class="wizardColorPresetMeta">' +
          '<div class="wizardPalettePreview wizardPalettePreviewInline" style="background:' + esc(effectiveCardColor()) + ';--preview-shape-a:' + esc(palette.previewA) + ';--preview-shape-b:' + esc(palette.previewB) + ';"></div>' +
          '<div class="wizardHint">Deze sfeer zet meteen een rustige basis. Daaronder kun je alles nog los aanpassen.</div>' +
        '</div>' +
      '</section>' +
      '<section class="ctrlG wizardEditorControlCard wizardColorCard">' +
        '<label class="cgT">Vormkleur</label>' +
        '<div class="wizardHint">Kies eerst welke vorm actief is; geef daarna elke vormlaag een eigen kleur.</div>' +
        '<div class="wizardShapeColorActiveRow">' + renderShapeLayerChipRow() + '</div>' +
        renderSwatchPicker(wizardShapeColorRows(), effectiveShapeLayerColor(activeShape), 'data-shape-fill', 'wizardColorChoiceSoft', 'Meer vormkleuren') +
      '</section>' +
      '<section class="ctrlG wizardEditorControlCard wizardColorCard">' +
        '<label class="cgT">Accentkleur</label>' +
        '<div class="wizardHint">Voor iconen, lijnen en kleine kleuraccenten.</div>' +
        renderSwatchPicker(STANDARD_ACCENT_ROWS, getAccentColor(), 'data-accent-color', '', 'Meer accentkleuren') +
      '</section>' +
      '<section class="ctrlG wizardEditorControlCard wizardColorCard">' +
        '<label class="cgT">Tekstkleur</label>' +
        '<div class="wizardHint">Voor de titel en tekst op je kaarten.</div>' +
        renderSwatchPicker(STANDARD_TEXT_ROWS, effectiveTextColor(), 'data-text-color', '', 'Meer tekstkleuren') +
      '</section>' +
      '<section class="ctrlG wizardEditorControlCard wizardColorCard wizardColorCardHint">' +
        '<div class="wizardHint">De basistint van kaart en achtergrond kies je in <strong>Achtergrond</strong>, zodat kleur en ondergrond logisch bij elkaar blijven.</div>' +
      '</section>' +
    '</div>'
  );
}

function renderDesignBackgroundPanel() {
  var palette = getSelectedPalette();
  var accent = getAccentColor();
  var bg = ensureWizardBackgroundConfig();
  var autoMode = bg.autoMode !== false;
  var activePalette = wizardEditableBackgroundPalette();
  var autoPalette = wizardAutoBackgroundPalette();
  var shapes = wizardSelectedBackgroundShapes();
  var count = typeof bg.blobCount === 'number' ? Math.max(2, Math.min(22, Math.round(bg.blobCount))) : 7;
  var size = typeof bg.sizeScale === 'number' ? Math.max(0.3, Math.min(2.4, bg.sizeScale)) : 0.85;
  var alpha = typeof bg.alphaBoost === 'number' ? Math.max(0.4, Math.min(3.2, bg.alphaBoost)) : 1.05;
  var irregularity = typeof bg.blobIrregularity === 'number' ? Math.max(0.05, Math.min(0.65, bg.blobIrregularity)) : 0.35;
  var bgShapeOptions = [
    { id: 'organic', label: 'Organisch', icon: 'blob' },
    { id: 'circle', label: 'Cirkels', icon: 'circle' },
    { id: 'grid', label: 'Raster', icon: 'diamond' },
    { id: 'triangle', label: 'Driehoeken', icon: 'triangle' },
    { id: 'diamond', label: 'Diamanten', icon: 'diamond' }
  ];
  return (
    '<div class="bgCtrls wizardDesignControlStack wizardDesignControlStack--background">' +
      '<section class="ctrlG wizardEditorControlCard wizardColorCard">' +
        '<label class="cgT">Basistint</label>' +
        '<div class="wizardHint">Hier kies je uit hetzelfde standaardpalet als op je site. Deze tint stuurt meteen je kaart en achtergrond mee.</div>' +
        renderSwatchPicker(STANDARD_BACKGROUND_ROWS, effectiveCardColor(), 'data-card-color', 'wizardColorChoiceSoft', 'Meer achtergrondtinten') +
      '</section>' +
      '<section class="ctrlG wizardEditorControlCard wizardColorCard">' +
        '<label class="cgT">Structuur</label>' +
        '<div class="wizardHint">Hier wissel je alleen de basisstructuur van de kaart zelf.</div>' +
        '<div class="wizardSelectPills wizardBackgroundPresetPills">' +
          BACKGROUND_PRESETS.map(function(background){
            var selected = state.wizardDraft.design.backgroundPreset === background.id;
            return (
              '<button class="wizardSelectPill wizardBackgroundPresetPill' + (selected ? ' is-selected' : '') + '" type="button" data-background-choice="' + background.id + '">' +
                '<span class="wizardBackgroundPresetThumb" style="' + backgroundPreviewStyle(background.id, palette, accent) + '"></span>' +
                '<span>' + esc(background.label) + '</span>' +
              '</button>'
            );
          }).join('') +
        '</div>' +
      '</section>' +
      '<section class="ctrlG wizardEditorControlCard bgAutoCard wizardBackgroundEditorCard">' +
        '<label class="cgT">Achtergrond</label>' +
        '<div class="togR2 wizardBgToggleRow">' +
          '<label for="wizardBgAuto">Automatisch</label>' +
          '<label class="tog"><input id="wizardBgAuto" type="checkbox" data-bg-auto="1"' + (autoMode ? ' checked' : '') + '><span class="togSl"></span></label>' +
        '</div>' +
        '<div class="bgAutoHint">' + (autoMode ? 'Volgt vormen en kleuren van de hele set.' : 'Kies zelf vormen, kleuren en intensiteit.') + '</div>' +
        (autoMode ? (
          '<div class="wizardBgAutoPaletteWrap">' +
            '<div class="wizardBgAutoPaletteTitle">Automatisch palette</div>' +
            '<div class="bgAutoPaletteRow">' +
              autoPalette.map(function(color, index){
                var light = String(color || '').toLowerCase() === '#ffffff';
                return '<span class="brandSw bgAutoSw' + (light ? ' brandSwLight' : '') + (index === 0 ? ' sel' : '') + '" style="background:' + esc(color) + '"></span>';
              }).join('') +
            '</div>' +
          '</div>'
        ) : '') +
        (!autoMode ? (
          '<div class="wizardBgManualStack">' +
            '<div class="ctrlG wizardEditorControlCard">' +
              '<label class="cgT">Kleur</label>' +
              '<div class="bgAutoHint">De witte achtergrond kleurt subtiel mee met je kaartkleur.</div>' +
              '<div class="togR2 wizardBgToggleRow">' +
                '<label for="wizardBgAutoTint">Achtergrond tint</label>' +
                '<label class="tog"><input id="wizardBgAutoTint" type="checkbox" data-bg-auto-tint="1"' + (bg.autoTint !== false ? ' checked' : '') + '><span class="togSl"></span></label>' +
              '</div>' +
              renderWizardBackgroundPaletteEditor(activePalette) +
            '</div>' +
            '<div class="ctrlG wizardEditorControlCard">' +
              '<label class="cgT">Vormen</label>' +
              '<div class="bgShapeBar wizardBgShapeBar">' +
                bgShapeOptions.map(function(option){
                  var selected = shapes.indexOf(option.id) >= 0;
                  return '<button class="shapeTypeBtn' + (selected ? ' sel' : '') + '" type="button" data-bg-shape="' + option.id + '" title="' + esc(option.label) + '" aria-label="' + esc(option.label) + '">' + renderMiniShapeSvg(option.icon) + '</button>';
                }).join('') +
              '</div>' +
              '<div class="bgAutoHint">Bepaalt hoe strak of organisch de vormen aanvoelen.</div>' +
              '<div class="ctrlR"><label>Vormvariatie</label><input class="shapeSlider" data-bg-irregularity="1" style="--pct:' + sliderPercent(irregularity, 0.05, 0.65) + '%" type="range" min="0.05" max="0.65" step="0.05" value="' + irregularity + '"><span class="cv" data-bg-irregularity-label="1">' + sliderValueHtml(Math.round(irregularity * 100), '%') + '</span></div>' +
            '</div>' +
          '</div>'
        ) : '') +
        '<div class="ctrlG wizardEditorControlCard">' +
          '<label class="cgT">Intensiteit</label>' +
          '<div class="ctrlR"><label>Aantal</label><input class="shapeSlider" data-bg-count="1" style="--pct:' + sliderPercent(count, 2, 22) + '%" type="range" min="2" max="22" step="1" value="' + count + '"><span class="cv" data-bg-count-label="1">' + sliderValueHtml(count, '') + '</span></div>' +
          '<div class="ctrlR"><label>Grootte</label><input class="shapeSlider" data-bg-size="1" style="--pct:' + sliderPercent(size, 0.3, 2.4) + '%" type="range" min="0.3" max="2.4" step="0.1" value="' + size + '"><span class="cv" data-bg-size-label="1">' + sliderValueHtml(size, '×') + '</span></div>' +
          '<div class="ctrlR"><label>Zichtbaarheid</label><input class="shapeSlider" data-bg-alpha="1" style="--pct:' + sliderPercent(alpha, 0.2, 3.2) + '%" type="range" min="0.2" max="3.2" step="0.1" value="' + alpha + '"><span class="cv" data-bg-alpha-label="1">' + sliderValueHtml(alpha, '×') + '</span></div>' +
          '<div class="bgAutoHint">Bepaal de zichtbaarheid van de achtergrond.</div>' +
        '</div>' +
      '</section>' +
    '</div>'
  );
}

function renderTypographyStep() {
  var preset = getTypographyPreset();
  var titleFont = effectiveTitleFont();
  var bodyFont = effectiveBodyFont();
  var titlePt = String(effectiveTitlePt());
  var bodyPt = String(effectiveBodyPt());
  return (
    '<h1 class="wizardTitle">Kies je typografie</h1>' +
    '<p class="wizardLead">Kies eerst een sfeer als startpunt. Daarna kun je titel, tekst en grootte helemaal zelf fijnregelen.</p>' +
    '<div class="wizardTypographyGrid">' +
      '<div class="wizardControlCard wizardTypographyIntroCard">' +
        '<div>' +
          '<div class="wizardMiniTitle">Sfeer</div>' +
          '<select id="typographyPresetSelect" class="fontSel" style="margin-top:10px">' +
            TYPOGRAPHY_PRESETS.map(function(item){
              var selected = item.id === state.wizardDraft.typography.preset ? ' selected' : '';
              return '<option value="' + esc(item.id) + '"' + selected + '>' + esc(item.label + ' - ' + item.note) + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="wizardTypographyPreviewCard">' +
          '<div class="wizardTypographyPreviewTitle" style="font-family:\'' + esc(titleFont) + '\',serif;font-size:' + esc(titlePt) + 'pt">Diep luisteren begint met aandacht</div>' +
          '<div class="wizardTypographyPreviewBody" style="font-family:\'' + esc(bodyFont) + '\',sans-serif;font-size:' + esc(bodyPt) + 'pt">Deze sfeer voelt ' + esc(preset.note.toLowerCase()) + ' en blijft later gewoon verder aanpasbaar in de editor.</div>' +
        '</div>' +
        '<div class="wizardHint">De tekstkleur heb je al in de vorige stap gekozen; hier regel je alleen lettertype en formaat.</div>' +
      '</div>' +
      '<div class="wizardControlCard wizardTypographyEditorCard">' +
        '<div class="wizardTypographySelectGrid">' +
          '<div>' +
            '<div class="wizardMiniTitle">Titel lettertype</div>' +
            '<select id="titleFontSelect" class="fontSel" style="margin-top:10px">' +
              TYPOGRAPHY_FONT_OPTIONS.map(function(font){
                var selected = font === titleFont ? ' selected' : '';
                return '<option value="' + esc(font) + '"' + selected + '>' + esc(font) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div>' +
            '<div class="wizardMiniTitle">Tekst lettertype</div>' +
            '<select id="bodyFontSelect" class="fontSel" style="margin-top:10px">' +
              TYPOGRAPHY_FONT_OPTIONS.map(function(font){
                var selected = font === bodyFont ? ' selected' : '';
                return '<option value="' + esc(font) + '"' + selected + '>' + esc(font) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
        '</div>' +
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
    '<h1 class="wizardTitle">Vul je kaarten in</h1>' +
    '<p class="wizardLead">Schrijf een vraag per regel. Een achterkant kun je scheiden met een <strong>|</strong>.</p>' +
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
      '<button class="wizardMiniBtn" type="button" data-add-theme="1">Thema toevoegen</button>' +
      (state.wizardDraft.themes.length > 1
        ? '<button class="wizardMiniBtn" type="button" data-remove-theme="' + esc(state.activeThemeId) + '">Actief thema verwijderen</button>'
        : '') +
    '</div>' +
    '<div class="wizardThemeEditor">' +
      '<div class="wizardField">' +
        '<label for="themeNameInput">Naam van dit thema</label>' +
        '<input id="themeNameInput" class="wizardInput" type="text" value="' + esc(activeTheme ? activeTheme.name : '') + '" placeholder="bijv. Samenwerking">' +
      '</div>' +
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

function renderPublicationStep() {
  var info = state.wizardDraft.infoPage;
  return (
    '<h1 class="wizardTitle">Bijna klaar</h1>' +
    '<p class="wizardLead">Kies wie je kaartenset mag zien en of je meteen een eenvoudige uitlegpagina wilt klaarzetten.</p>' +
    '<section class="wizardSection">' +
      '<div class="wizardMiniTitle">Wie mag je kaartenset zien?</div>' +
      '<div class="wizardOptionList">' +
        renderVisibilityCard('private', 'Priv&eacute;', 'Alleen jij ziet deze set in je dashboard.') +
        renderVisibilityCard('unlisted', 'Met link delen', 'Handig als je de set wilt bekijken of delen zonder hem breed te publiceren.') +
        renderVisibilityCard('public', 'Openbaar publiceren', 'Zet de set klaar om zichtbaar te maken voor anderen.') +
      '</div>' +
    '</section>' +
    '<section class="wizardSection">' +
      '<div class="wizardMiniTitle">Wil je een uitlegpagina toevoegen aan je kaartenset?</div>' +
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
  var isEditorActive = wizardPreviewEditingActive();
  var isShapeEditing = wizardShapeEditingEnabled();
  var sharedPreviewShell = getWizardSharedPreviewShell();
  var previewWindowClassName = 'stijlCanvasWindow wizardPreviewWindowShell is-preparing' +
    (isEditorActive ? ' is-editor-active' : ' viewer-only-preview') +
    (isShapeEditing ? ' is-shape-editing' : '') +
    (nightMode ? ' night' : '') +
    (gridMode ? ' grid-on grid-accent' : '');
  var previewShellHtml = sharedPreviewShell
    ? sharedPreviewShell.renderCanvasPreviewShell({
        columnClassName: 'stijlPreviewCol stijlCanvasCenter wizardPreviewCol',
        stageClassName: 'wizardPreviewStage stijlCanvasStage',
        stageStyle: metrics.stageStyle,
        cardWrapClassName: 'stijlCanvasCardWrap wizardPreviewCardFrame',
        windowClassName: previewWindowClassName,
        windowStyle: metrics.shellStyle,
        topbarHtml: renderPreviewControls(),
        bgWrapId: 'wizardPreviewBgWrap',
        bgCanvasId: 'wizardPreviewBgCanvas',
        previewCoreHtml: preview.html,
        backbarHtml: renderPreviewBackbar()
      })
    : (
      '<div class="stijlPreviewCol stijlCanvasCenter wizardPreviewCol">' +
        '<div class="wizardPreviewStage stijlCanvasStage" style="' + esc(metrics.stageStyle) + '">' +
          '<div class="stijlCanvasCardWrap wizardPreviewCardFrame">' +
            '<div class="' + esc(previewWindowClassName) + '" style="' + esc(metrics.shellStyle) + '">' +
              renderPreviewControls() +
              '<div class="bgCanvas wizardPreviewBgCanvas" id="wizardPreviewBgWrap" aria-hidden="true">' +
                '<canvas id="wizardPreviewBgCanvas"></canvas>' +
              '</div>' +
              '<div class="stijlCanvasWindowInner">' +
                preview.html +
              '</div>' +
              renderPreviewBackbar() +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  return (
    '<aside class="wizardPreviewPanel is-preparing" aria-label="Live preview">' +
      '<div class="wizardPreviewViewport" id="wizardPreviewViewport">' +
        '<div class="wizardPreviewScaleFrame" id="wizardPreviewScaleFrame">' +
          previewShellHtml +
        '</div>' +
      '</div>' +
    '</aside>'
  );
}

function renderPreviewControls() {
  var sharedPreviewShell = getWizardSharedPreviewShell();
  var nightMode = previewNightEnabled();
  var gridMode = previewGridEnabled();
  var backMode = previewBackMode();
  if (sharedPreviewShell && typeof sharedPreviewShell.buildTopbarHtml === 'function') {
    return sharedPreviewShell.buildTopbarHtml({
      className: 'wizardPreviewTopbar',
      zoom: {
        className: 'wizardPreviewZoomControl',
        zoomPct: state.previewZoom || PREVIEW_DEFAULT_ZOOM,
        resetTitle: 'Telefoon-formaat (' + PREVIEW_DEFAULT_ZOOM + '%)',
        zoomOutAttrText: ' data-preview-zoom="-' + PREVIEW_ZOOM_STEP + '"',
        resetAttrText: ' data-preview-zoom-reset="1"',
        zoomInAttrText: ' data-preview-zoom="' + PREVIEW_ZOOM_STEP + '"'
      },
      nav: {
        backAttrText: ' tabindex="-1" aria-hidden="true"',
        centerLabel: 'Cover',
        centerClassName: 'previewNavPosStatic',
        centerAttrText: ' tabindex="-1" aria-hidden="true"',
        forwardAttrText: ' tabindex="-1" aria-hidden="true"'
      },
      actions: {
        className: 'wizardPreviewActionPill',
        showFlip: backMode !== 'blank',
        flipSelected: !!state.previewFlipped,
        flipAttrText: ' data-preview-flip="1"',
        showGrid: true,
        gridSelected: gridMode,
        gridAttrText: ' data-preview-grid-toggle="1"',
        showNight: true,
        nightSelected: nightMode,
        nightAttrText: ' data-preview-night-toggle="1"'
      }
    });
  }
  return (
    '<div class="stijlCanvasTopbar wizardPreviewTopbar">' +
      '<div class="cvZoomControl wizardPreviewZoomControl">' +
        '<button class="cvZoomBtn" type="button" data-preview-zoom="-' + PREVIEW_ZOOM_STEP + '" title="Uitzoomen">−</button>' +
        '<button class="cvZoomPct" type="button" data-preview-zoom-reset="1" title="Telefoon-formaat (' + PREVIEW_DEFAULT_ZOOM + '%)">' + esc(String(state.previewZoom || PREVIEW_DEFAULT_ZOOM)) + '%</button>' +
        '<button class="cvZoomBtn" type="button" data-preview-zoom="' + PREVIEW_ZOOM_STEP + '" title="Inzoomen">+</button>' +
      '</div>' +
      '<div class="previewTopPill previewNavPill">' +
        '<button class="stijlCanvasNightBtn" type="button" tabindex="-1" aria-hidden="true" title="Vorige">' +
          previewNavArrowIconHtml('back') +
        '</button>' +
        '<button class="stijlCanvasNightBtn previewNavPosBtn previewNavPosStatic" type="button" tabindex="-1" aria-hidden="true">' +
          '<span class="previewNavPosText">Cover</span>' +
        '</button>' +
        '<button class="stijlCanvasNightBtn" type="button" tabindex="-1" aria-hidden="true" title="Volgende">' +
          previewNavArrowIconHtml('forward') +
        '</button>' +
      '</div>' +
      '<div class="stijlCanvasTopbarRight">' +
        '<div class="previewTopPill wizardPreviewActionPill">' +
          (backMode === 'blank'
            ? ''
            : (
              '<button class="stijlCanvasFlipBtn' + (state.previewFlipped ? ' sel' : '') + '" type="button" data-preview-flip="1" aria-label="Kaart omdraaien" title="Kaart omdraaien">' +
                '<span class="flipGlyph" aria-hidden="true">↻</span>' +
              '</button>' +
              '<div class="previewTopPillSep" aria-hidden="true"></div>'
            )) +
          '<button class="stijlCanvasGridBtn' + (gridMode ? ' sel' : '') + '" type="button" data-preview-grid-toggle="1" aria-label="' + (gridMode ? 'Raster uitzetten' : 'Raster tonen') + '" title="' + (gridMode ? 'Raster uitzetten' : 'Raster tonen') + '">' +
            previewGridToggleIconHtml() +
          '</button>' +
          '<button class="stijlCanvasNightBtn' + (nightMode ? ' sel' : '') + '" type="button" data-preview-night-toggle="1" aria-label="' + (nightMode ? 'Nachtmodus uitzetten' : 'Nachtmodus aanzetten') + '" title="' + (nightMode ? 'Nachtmodus uitzetten' : 'Nachtmodus aanzetten') + '">' +
            previewNightToggleIconHtml(nightMode) +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
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
  if (stepId === 'name') return 'Start klein: naam en identiteit eerst.';
  if (stepId === 'design') {
    var substepId = getDesignSubstep().id;
    if (substepId === 'shapes') return 'Kies hier rustig de bouwstenen; kleuren en achtergrond volgen binnen dezelfde ontwerpstap.';
    if (substepId === 'colors') return 'Alle kleurkeuzes op dit scherm werken meteen door in de preview.';
    return 'De achtergrondstructuur verandert meteen mee, zonder dat je vormen of kleuren kwijtraakt.';
  }
  if (stepId === 'questions') return 'E&eacute;n vraag per regel is genoeg om te starten.';
  if (stepId === 'publish') return state.editingSet
    ? 'Bij opslaan werken we je bestaande set meteen bij in je ruimte.'
    : 'Bij aanmaken zetten we je draft om naar een echte set in je ruimte.';
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
      state.stepIndex = Math.max(0, Math.min(STEP_DEFS.length - 1, nextIndex));
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-design-substep]').forEach(function(button){
    button.addEventListener('click', function(){
      setDesignSubstep(button.getAttribute('data-design-substep') || DESIGN_SUBSTEPS[0].id);
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-preview-zoom]').forEach(function(button){
    button.addEventListener('click', function(){
      var delta = parseInt(button.getAttribute('data-preview-zoom') || '0', 10) || 0;
      stepWizardPreviewZoom(delta);
    });
  });

  root.querySelectorAll('[data-preview-zoom-reset]').forEach(function(button){
    button.addEventListener('click', function(){
      setWizardPreviewZoom(PREVIEW_DEFAULT_ZOOM);
    });
  });

  root.querySelectorAll('[data-preview-flip]').forEach(function(button){
    button.addEventListener('click', function(){
      toggleWizardPreviewFlip();
    });
  });

  root.querySelectorAll('[data-preview-grid-toggle]').forEach(function(button){
    button.addEventListener('click', function(){
      toggleWizardPreviewGrid();
    });
  });

  root.querySelectorAll('[data-preview-night-toggle]').forEach(function(button){
    button.addEventListener('click', function(){
      toggleWizardPreviewNight();
    });
  });

  root.querySelectorAll('[data-preview-back-mode]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.preview = state.wizardDraft.preview || {};
      state.wizardDraft.preview.backMode = button.getAttribute('data-preview-back-mode') || 'mirror';
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
      activeLayer.type = button.getAttribute('data-shape-choice') || activeLayer.type;
      syncLegacyShapeFields();
      commitWizardChange(false);
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
      var template = getActiveDesignShapeLayer() || currentDesignShapeState();
      var nextLayer = defaultDesignShapeLayer({
        type: template.type || 'blob',
        x: clamp(Number(template.x) + 8, -25, 125),
        y: clamp(Number(template.y) + 8, -25, 125),
        size: clamp(Number(template.size), 12, 120),
        rotate: clamp(Number(template.rotate), -180, 180),
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
      state.wizardDraft.design.iconPreset = button.getAttribute('data-icon-choice') || state.wizardDraft.design.iconPreset;
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-shape-fill]').forEach(function(button){
    button.addEventListener('click', function(){
      var activeLayer = getActiveDesignShapeLayer();
      if (!activeLayer) return;
      activeLayer.fill = button.getAttribute('data-shape-fill') || '';
      commitWizardChange(false);
    });
  });

  var iconSearchInput = document.getElementById('iconSearchInput');
  if (iconSearchInput) {
    iconSearchInput.addEventListener('input', function(){
      state.iconSearchQuery = iconSearchInput.value || '';
      renderApp(true);
    });
  }

  root.querySelectorAll('[data-accent-color]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.design.accentColor = button.getAttribute('data-accent-color') || state.wizardDraft.design.accentColor || '';
      syncWizardManualBackgroundPalette();
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-card-color]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.colors = state.wizardDraft.colors || {};
      state.wizardDraft.colors.cardColor = button.getAttribute('data-card-color') || '';
      syncWizardManualBackgroundPalette();
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-background-choice]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.design.backgroundPreset = button.getAttribute('data-background-choice') || state.wizardDraft.design.backgroundPreset;
      commitWizardChange(false);
    });
  });

  var bgAutoToggle = root.querySelector('[data-bg-auto]');
  if (bgAutoToggle) {
    bgAutoToggle.addEventListener('change', function(){
      var bg = ensureWizardBackgroundConfig();
      bg.autoMode = !!bgAutoToggle.checked;
      if (bg.autoMode === false) {
        if (!Array.isArray(bg.blobShapes) || !bg.blobShapes.length) bg.blobShapes = ['organic'];
        bg.blobSpread = bg.blobSpread || bg.blobShapes[0] || 'organic';
        syncWizardManualBackgroundPalette();
      }
      commitWizardChange(false);
    });
  }

  var bgAutoTintToggle = root.querySelector('[data-bg-auto-tint]');
  if (bgAutoTintToggle) {
    bgAutoTintToggle.addEventListener('change', function(){
      var bg = ensureWizardBackgroundConfig();
      bg.autoTint = !!bgAutoTintToggle.checked;
      commitWizardChange(false);
    });
  }

  root.querySelectorAll('[data-bg-shape]').forEach(function(button){
    button.addEventListener('click', function(){
      wizardToggleBackgroundShape(button.getAttribute('data-bg-shape') || 'organic');
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-bg-palette-toggle]').forEach(function(button){
    button.addEventListener('click', function(){
      wizardToggleBackgroundPaletteColor(button.getAttribute('data-bg-palette-toggle') || '');
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-bg-palette-custom]').forEach(function(input){
    input.addEventListener('input', function(){
      var sw = input.parentElement && input.parentElement.querySelector('.brandCustomSw');
      if (sw) sw.style.setProperty('--pick', input.value || '#E4F0E8');
    });
    input.addEventListener('change', function(){
      setWizardBackgroundPaletteCustomColor(input.value || '');
      commitWizardChange(false);
    });
  });

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
  wireBackgroundRange('[data-bg-irregularity]', '[data-bg-irregularity-label]', 'blobIrregularity', 0.05, 0.65, '%', function(value){ return Math.round(value * 100); });

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
      state.wizardDraft.typography.titleFont = normalizeTypographyFont(titleFontSelect.value, effectiveTitleFont());
      commitWizardChange(false);
    });
  }

  var bodyFontSelect = root.querySelector('#bodyFontSelect');
  if (bodyFontSelect) {
    bodyFontSelect.addEventListener('change', function(){
      state.wizardDraft.typography.bodyFont = normalizeTypographyFont(bodyFontSelect.value, effectiveBodyFont());
      commitWizardChange(false);
    });
  }

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

  root.querySelectorAll('[data-text-color]').forEach(function(button){
    button.addEventListener('click', function(){
      state.wizardDraft.typography.textColor = button.getAttribute('data-text-color') || '';
      commitWizardChange(false);
    });
  });

  root.querySelectorAll('[data-theme-select]').forEach(function(button){
    button.addEventListener('click', function(){
      state.activeThemeId = button.getAttribute('data-theme-select') || state.activeThemeId;
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
      if (isDesignStep()) {
        var designIndex = getDesignSubstepIndex();
        if (designIndex > 0) {
          setDesignSubstep(DESIGN_SUBSTEPS[designIndex - 1].id);
          commitWizardChange(false);
          return;
        }
      }
      state.stepIndex = Math.max(0, state.stepIndex - 1);
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

function addTheme() {
  var nextIndex = state.wizardDraft.themes.length + 1;
  var id = 'theme-' + Date.now().toString(36) + '-' + nextIndex;
  var theme = { id: id, name: 'Thema ' + nextIndex };
  state.wizardDraft.themes.push(theme);
  state.wizardDraft.questions[id] = '';
  state.activeThemeId = id;
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
  if (isDesignStep()) {
    var designIndex = getDesignSubstepIndex();
    if (designIndex < DESIGN_SUBSTEPS.length - 1) {
      setDesignSubstep(DESIGN_SUBSTEPS[designIndex + 1].id);
      commitWizardChange(false);
      return;
    }
  }
  if (state.stepIndex === STEP_DEFS.length - 2) {
    await saveDraftAsSet();
    return;
  }
  state.stepIndex = Math.min(STEP_DEFS.length - 1, state.stepIndex + 1);
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
    state.stepIndex = STEP_DEFS.length - 1;
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

  themeRecords.forEach(function(record){
    var parsed = parseQuestionLines(state.wizardDraft.questions[record.id] || '');
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
    doubleSided: true,
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
    '--pk-text-align': 'center',
    '--pk-text-valign': 'center'
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
  var map = { cover: 0 };
  themeRecords.forEach(function(record){
    map[record.key] = 0;
  });
  return map;
}

function buildCoverTexts(typographyPreset, palette) {
  if (state.wizardDraft && state.wizardDraft.coverTexts !== null && state.wizardDraft.coverTexts !== undefined) {
    return clonePlainData(state.wizardDraft.coverTexts) || [];
  }
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

function parseQuestionLines(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map(function(line){
      return String(line || '').trim();
    })
    .filter(Boolean)
    .map(function(line){
      var parts = line.split('|');
      var front = String(parts[0] || '').trim();
      var back = String(parts.slice(1).join('|') || '').trim();
      return {
        _qid: crypto.randomUUID(),
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

  if (stepId === 'done') {
    return {
      bundle: bundle,
      label: 'Samenvatting',
      caption: 'De set staat nu klaar in je ruimte en kan direct verder worden aangepast in de editor of bekeken in view-modus.',
      html: renderSharedPreview(bundle, activeRecord.key, firstQuestion)
    };
  }

  if (stepId === 'name' || stepId === 'format' || stepId === 'design' || stepId === 'type') {
    return {
      bundle: bundle,
      label: 'Cover preview',
      caption: 'Zo voelt de voorkant nu aan: rustig, ruimtelijk en meteen herkenbaar.',
      html: renderSharedCoverPreview(bundle)
    };
  }

  return {
    bundle: bundle,
    label: 'Eerste kaart',
    caption: activeRecord.label + ' is actief. De eerste vraag uit dit thema wordt meteen als kaart opgebouwd.',
    html: renderSharedPreview(bundle, activeRecord.key, firstQuestion)
  };
}

function renderSharedCoverPreview(bundle) {
  var renderer = window.PK && window.PK.sharedCardRenderer;
  if (!renderer || typeof renderer.render !== 'function') {
    return '<div class="wizardPreviewRenderer"><div class="wizardMuted">Preview niet beschikbaar.</div></div>';
  }
  return renderer.render({
    meta: bundle.meta,
    wrapClass: 'stijlCardPrevWrap wizardPreviewCardViewport',
    previewKey: 'cover',
    themeKey: 'cover',
    frontTxt: '',
    backTxt: '',
    flipped: !!state.previewFlipped,
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
    wrapClass: 'stijlCardPrevWrap wizardPreviewCardViewport',
    previewKey: previewKey,
    themeKey: previewKey,
    frontTxt: question && (question.voorkant || question.q || '') || '',
    backTxt: question && (question.achterkant || question.back || '') || '',
    flipped: !!state.previewFlipped,
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
  return {
    format: format,
    stageStyle: '--wizard-preview-shell-h:' + shellHeight + 'px;--editor-preview-card-w:320px',
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

function getWizardSharedPreviewShell() {
  var helper = window.PK && window.PK.sharedPreviewShell;
  return helper && typeof helper.renderCanvasPreviewShell === 'function'
    ? helper
    : null;
}

function renderPreviewBackbar() {
  if (!wizardPreviewEditingActive()) return '';
  var backMode = previewBackMode();
  var sharedPreviewShell = getWizardSharedPreviewShell();
  if (sharedPreviewShell && typeof sharedPreviewShell.buildBackbarHtml === 'function') {
    return sharedPreviewShell.buildBackbarHtml({
      enabled: true,
      label: 'Achterkant',
      modes: [
        {
          label: 'Zelfde',
          selected: backMode === 'mirror',
          title: 'Zelfde ontwerp',
          attrText: ' data-preview-back-mode="mirror"'
        },
        {
          label: 'Gespiegeld',
          selected: backMode === 'reflect',
          title: 'Zelfde ontwerp gespiegeld',
          attrText: ' data-preview-back-mode="reflect"'
        },
        {
          label: 'Eigen',
          selected: backMode === 'blank',
          title: 'Eigen achterkant',
          attrText: ' data-preview-back-mode="blank"'
        }
      ]
    });
  }
  return (
    '<div class="stijlCanvasBackbar">' +
      '<div class="stijlCanvasBackbarLabel">Achterkant</div>' +
      '<div class="stijlCanvasBackbarGroup">' +
        '<button class="stijlBackModeBtn' + (backMode === 'mirror' ? ' sel' : '') + '" type="button" data-preview-back-mode="mirror" title="Zelfde ontwerp">Zelfde</button>' +
        '<button class="stijlBackModeBtn' + (backMode === 'reflect' ? ' sel' : '') + '" type="button" data-preview-back-mode="reflect" title="Zelfde ontwerp gespiegeld">Gespiegeld</button>' +
        '<button class="stijlBackModeBtn' + (backMode === 'blank' ? ' sel' : '') + '" type="button" data-preview-back-mode="blank" title="Eigen achterkant">Eigen</button>' +
      '</div>' +
    '</div>'
  );
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
  var shell = root.querySelector('.wizardPreviewWindowShell');
  if (!shell) return null;
  return {
    viewport: root.querySelector('#wizardPreviewViewport'),
    scaleFrame: root.querySelector('#wizardPreviewScaleFrame'),
    shell: shell,
    cardWrap: shell.closest('.stijlCanvasCardWrap'),
    wrap: shell.querySelector('.stijlCardPrevWrap'),
    visual: shell.querySelector('.stijlCardPrevWrap .cardFaceOuter, .stijlCardPrevWrap .adminInfoSlide'),
    faceInner: shell.querySelector('.cardFaceInner'),
    topbar: shell.querySelector('.stijlCanvasTopbar'),
    zoomControl: shell.querySelector('.cvZoomControl'),
    zoomPct: shell.querySelector('.cvZoomPct'),
    flipButtons: Array.prototype.slice.call(shell.querySelectorAll('.stijlCanvasFlipBtn')),
    gridButtons: Array.prototype.slice.call(shell.querySelectorAll('[data-preview-grid-toggle="1"]')),
    nightButtons: Array.prototype.slice.call(shell.querySelectorAll('[data-preview-night-toggle="1"]'))
  };
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
  var frame = root.querySelector('#wizardPreviewScaleFrame');
  if (!frame) return 1;
  var raw = frame.getAttribute('data-preview-shell-scale') || '';
  var value = parseFloat(raw);
  return value > 0 ? value : 1;
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
  var frame = root.querySelector('#wizardPreviewScaleFrame');
  if (!viewport || !frame) return;
  var availableW = Math.max(0, viewport.clientWidth || viewport.offsetWidth || 0);
  if (!(availableW > 0)) return;
  var scale = Math.min(1, availableW / PREVIEW_SHELL_WIDTH);
  var scaledHeight = Math.round(currentPreviewShellHeight() * scale);
  viewport.style.height = scaledHeight + 'px';
  frame.style.transform = 'scale(' + scale + ')';
  frame.setAttribute('data-preview-shell-scale', String(scale));
}

function syncWizardPreviewLayout() {
  var els = wizardPreviewElements();
  if (!els || !previewWindowIsVisible(els.shell) || !els.wrap) return;
  var winW = els.shell.clientWidth || els.shell.offsetWidth || 0;
  var winH = els.shell.clientHeight || els.shell.offsetHeight || 0;
  if (!(winW > 0 && winH > 0)) return;
  var sideInset = 14;
  var contentTop = 34;
  var contentBottom = PREVIEW_BOTTOM_GUTTER;
  if (els.topbar) {
    sideInset = Math.max(8, Math.round(els.topbar.offsetLeft || 14));
    contentTop = Math.max(0, Math.round((els.topbar.offsetTop || 0) + (els.topbar.offsetHeight || 0) + 8));
  }
  els.shell.style.setProperty('--preview-side-inset', sideInset + 'px');
  els.shell.style.setProperty('--preview-content-top', contentTop + 'px');
  els.shell.style.setProperty('--preview-content-bottom', contentBottom + 'px');
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
  var isEditorActive = wizardPreviewEditingActive();
  var isShapeEditing = wizardShapeEditingEnabled();
  syncWizardPreviewScale();
  syncWizardPreviewLayout();
  var bounds = wizardPreviewZoomBounds();
  state.previewZoom = Math.max(bounds.min, Math.min(bounds.max, Number(state.previewZoom) || PREVIEW_DEFAULT_ZOOM));
  var scale = state.previewZoom / 100;
  if (els.visual) els.visual.style.zoom = scale;
  if (els.zoomPct) els.zoomPct.textContent = state.previewZoom + '%';
  if (els.faceInner) els.faceInner.classList.toggle('flipped', !!state.previewFlipped);
  if (els.shell) {
    els.shell.classList.toggle('night', previewNightEnabled());
    els.shell.classList.toggle('is-editor-active', isEditorActive);
    els.shell.classList.toggle('is-shape-editing', isShapeEditing);
    els.shell.classList.toggle('viewer-only-preview', !isEditorActive);
    els.shell.classList.toggle('grid-on', previewGridEnabled());
    els.shell.classList.toggle('grid-accent', previewGridEnabled());
  }
  els.flipButtons.forEach(function(button){
    button.classList.toggle('sel', !!state.previewFlipped);
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
}

function stepWizardPreviewZoom(delta) {
  var prev = state.previewZoom;
  setWizardPreviewZoom((state.previewZoom || PREVIEW_DEFAULT_ZOOM) + delta);
  if (state.previewZoom === prev) flashWizardPreviewZoomLimit();
}

function toggleWizardPreviewFlip() {
  state.previewFlipped = !state.previewFlipped;
  applyWizardPreviewUiState();
}

function toggleWizardPreviewGrid() {
  state.previewGrid = !state.previewGrid;
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  state.wizardDraft.preview.gridMode = !!state.previewGrid;
  applyWizardPreviewUiState();
}

function toggleWizardPreviewNight() {
  state.previewNight = !state.previewNight;
  state.wizardDraft.preview = state.wizardDraft.preview || {};
  state.wizardDraft.preview.nightMode = !!state.previewNight;
  applyWizardPreviewUiState();
  renderPreviewBackground();
}

function wizardPrimaryShapeNodes() {
  return Array.prototype.slice.call(root.querySelectorAll('.wizardPreviewWindowShell .cpShape[data-shape-role="primary"]'));
}

function syncWizardShapeEditorUi() {
  var activeLayer = getActiveDesignShapeLayer();
  if (!activeLayer) return;
  var activeLayerId = String(activeLayer.id || '').trim();
  var activeType = normalizeShapePresetId(activeLayer.type);
  root.querySelectorAll('[data-shape-layer-select]').forEach(function(button){
    var selected = String(button.getAttribute('data-shape-layer-select') || '').trim() === activeLayerId;
    button.classList.toggle('sel', selected);
    button.classList.toggle('active', selected);
  });
  root.querySelectorAll('[data-shape-choice]').forEach(function(button){
    var selected = normalizeShapePresetId(button.getAttribute('data-shape-choice') || '') === activeType;
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

function bindWizardShapeDragGlobals() {
  if (wizardShapeDragEventsBound) return;
  wizardShapeDragEventsBound = true;
  window.addEventListener('pointermove', function(ev){
    if (!wizardShapeDrag || ev.pointerId !== wizardShapeDrag.pointerId) return;
    moveWizardPrimaryShape(ev.clientX, ev.clientY);
  });
  window.addEventListener('pointerup', finishWizardPrimaryShapeDrag);
  window.addEventListener('pointercancel', finishWizardPrimaryShapeDrag);
}

function wireWizardShapeEditing() {
  bindWizardShapeDragGlobals();
  root.querySelectorAll('.wizardPreviewWindowShell.is-shape-editing .cpShape[data-shape-role="primary"]').forEach(function(node){
    node.addEventListener('pointerdown', startWizardPrimaryShapeDrag);
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
  return list.map(function(item){
    var align = item.align === 'center' ? '-50%' : item.align === 'right' ? '-100%' : '0';
    var color = item.color || '#17313A';
    var bg = item.bg ? '--cp-text-bg:' + esc(item.bg) + ';' : '';
    var weight = item.weight === 'bold' ? '700' : item.weight === 'semibold' ? '600' : item.weight === 'medium' ? '500' : '400';
    return (
      '<div class="cpTextBlock" style="left:' + clamp(item.x, 8, 92) + '%;top:' + clamp(item.y, 12, 88) + '%;transform:translate(' + align + ',-50%)">' +
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
  return layers.map(function(layer){
    var shapeType = normalizeShapePresetId(layer.type);
    var size = isCover ? layer.size : Math.max(24, Math.round(layer.size * 0.72));
    var color = effectiveShapeLayerColor(layer);
    var opacity = Math.max(0, Math.min(1, Number(layer.fillOpacity) || (shapeType === 'wave' ? 0.9 : 0.92)));
    return Object.assign(
      shapeLayerOfType(shapeType, layer.x, layer.y, size, color, opacity, layer.rotate),
      { role: 'primary', layerId: layer.id }
    );
  });
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
    fill: preset.fill ? recipe.accent : 'transparent',
    fillOpacity: preset.fill ? 0.94 : 1,
    stroke: recipe.accent,
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
  state.previewGrid = !!(state.wizardDraft.preview && state.wizardDraft.preview.gridMode);
  state.previewNight = !!(state.wizardDraft.preview && state.wizardDraft.preview.nightMode);
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
  var savedCardBgBaseByKey = ui.cardBgBaseByKey && typeof ui.cardBgBaseByKey === 'object' ? ui.cardBgBaseByKey : {};
  var indexBackground = clonePlainData(
    (ui.cardsIndex && ui.cardsIndex.background) ||
    (ui.index && ui.index.background) ||
    null
  );
  var infoFields = extractInfoPageFields(meta, bundle);
  var themeDefs = buildThemeDefinitions(meta, bundle);
  var shapeLayers = extractSavedShapeLayers(meta);
  var activeShapeLayer = shapeLayers[0] || defaultDesignShapeLayer();
  var questions = {};
  var themes = themeDefs.map(function(theme, index){
    var themeId = 'theme-' + (index + 1);
    questions[themeId] = serializeQuestionLines(bundle.questions && bundle.questions[theme.key]);
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
      iconPreset: normalizePresetId(ICON_PRESETS, meta.iconPreset, 'none'),
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
      cardColor: String(savedCardBgBaseByKey.cover || meta.cardColor || cssVars['--pk-set-card'] || cssVars['--pk-set-bg'] || paletteDefaults.card || '').trim()
    },
    typography: {
      preset: typographyPresetId,
      titleSize: detectTitleScale(meta),
      textSize: detectBodyScale(cssVars['--pk-font-size']),
      textColor: String(cssVars['--pk-set-text'] || paletteDefaults.text || '').trim(),
      titleFont: detectTitleFont(meta, typographyPreset.titleFont),
      bodyFont: detectBodyFont(cssVars, typographyPreset.bodyFont),
      titlePt: detectTitlePointSize(meta),
      bodyPt: detectBodyPointSize(cssVars['--pk-font-size'])
    },
    coverTexts: clonePlainData(Array.isArray(ui.coverTexts) ? ui.coverTexts : []),
    themes: themes,
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
      backMode: (function(mode){
        mode = String(mode || '').trim();
        return mode === 'reflect' || mode === 'blank' ? mode : 'mirror';
      })(meta.backMode),
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

function sameColorHex(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function getPaletteDefaults(input) {
  var palette = typeof input === 'string'
    ? getPresetById(PALETTE_PRESETS, normalizePresetId(PALETTE_PRESETS, input, 'warm-sand'), PALETTE_PRESETS[0])
    : (input || getSelectedPalette());
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
  var normalized = normalizeShapePresetId(type);
  var transform = miniShapeTransform(normalized);
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><g' + (transform ? ' transform="' + transform + '"' : '') + '>' + miniShapeMarkup(normalized) + '</g></svg>';
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
  state.wizardDraft.palette = normalizePresetId(PALETTE_PRESETS, paletteId, state.wizardDraft.palette || 'warm-sand');
  var defaults = getPaletteDefaults(state.wizardDraft.palette);
  state.wizardDraft.design.accentIndex = 0;
  state.wizardDraft.design.accentColor = defaults.accent;
  state.wizardDraft.colors = state.wizardDraft.colors || {};
  state.wizardDraft.colors.cardColor = defaults.card;
  state.wizardDraft.typography.textColor = defaults.text;
  syncWizardManualBackgroundPalette();
}

function normalizeShapePresetId(value) {
  var input = String(value || '').trim();
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
  return normalizePresetId(SHAPE_PRESETS, next, 'blob');
}

function getShapeLabel(shapeId) {
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
  return {
    id: String(layer.id || '').trim(),
    type: normalizeShapePresetId(layer.type),
    x: clamp(Number(layer.x), -25, 125),
    y: clamp(Number(layer.y), -25, 125),
    size: clamp(Number(layer.size), 12, 120),
    rotate: clamp(Number(layer.rotate), -180, 180),
    fill: String(layer.fill || '').trim(),
    fillOpacity: Math.max(0, Math.min(1, Number(layer.fillOpacity) || 0.92))
  };
}

function effectiveShapeLayerColor(layer) {
  var recipe = backgroundRecipe(getSelectedPalette(), getAccentColor(), state.wizardDraft.design.backgroundPreset, effectiveCardColor());
  var color = layer && layer.fill ? String(layer.fill).trim() : '';
  return color || recipe.primary;
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

function effectiveTextColor() {
  var stored = state.wizardDraft.typography && state.wizardDraft.typography.textColor
    ? String(state.wizardDraft.typography.textColor).trim()
    : '';
  return stored || getPaletteDefaults(getSelectedPalette()).text;
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
