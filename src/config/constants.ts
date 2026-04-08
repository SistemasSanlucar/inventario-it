export const PAISES_LIST = [
  'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Arabia Saudita', 'Argelia', 'Argentina',
  'Armenia', 'Australia', 'Austria', 'Azerbaiyán', 'Bahamas', 'Bangladés', 'Bélgica', 'Belice',
  'Benín', 'Bielorrusia', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana', 'Brasil', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Bután', 'Cabo Verde', 'Camboya', 'Camerún', 'Canadá', 'Chad',
  'Chile', 'China', 'Chipre', 'Colombia', 'Comoras', 'Congo', 'Corea del Norte', 'Corea del Sur',
  'Costa de Marfil', 'Costa Rica', 'Croacia', 'Cuba', 'Dinamarca', 'Dominica', 'Ecuador', 'Egipto',
  'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea', 'Eslovaquia', 'Eslovenia', 'España',
  'Estados Unidos', 'Estonia', 'Etiopía', 'Filipinas', 'Finlandia', 'Fiyi', 'Francia', 'Gabón',
  'Gambia', 'Georgia', 'Ghana', 'Granada', 'Grecia', 'Guatemala', 'Guinea', 'Guinea-Bisáu',
  'Guinea Ecuatorial', 'Guyana', 'Haití', 'Honduras', 'Hungría', 'India', 'Indonesia', 'Irak',
  'Irán', 'Irlanda', 'Islandia', 'Islas Marshall', 'Islas Salomón', 'Israel', 'Italia', 'Jamaica',
  'Japón', 'Jordania', 'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kuwait', 'Laos',
  'Lesoto', 'Letonia', 'Líbano', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania', 'Luxemburgo',
  'Macedonia del Norte', 'Madagascar', 'Malasia', 'Malaui', 'Maldivas', 'Malí', 'Malta',
  'Marruecos', 'Mauricio', 'Mauritania', 'México', 'Micronesia', 'Moldavia', 'Mónaco', 'Mongolia',
  'Montenegro', 'Mozambique', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Níger', 'Nigeria',
  'Noruega', 'Nueva Zelanda', 'Omán', 'Países Bajos', 'Pakistán', 'Palaos', 'Panamá',
  'Papúa Nueva Guinea', 'Paraguay', 'Perú', 'Polonia', 'Portugal', 'Qatar', 'Reino Unido',
  'República Centroafricana', 'República Checa', 'República Democrática del Congo',
  'República Dominicana', 'Ruanda', 'Rumanía', 'Rusia', 'Samoa', 'San Cristóbal y Nieves',
  'San Marino', 'San Vicente y las Granadinas', 'Santa Lucía', 'Santo Tomé y Príncipe',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leona', 'Singapur', 'Siria', 'Somalia', 'Sri Lanka',
  'Suazilandia', 'Sudáfrica', 'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza', 'Surinam', 'Tailandia',
  'Tanzania', 'Tayikistán', 'Timor Oriental', 'Togo', 'Tonga', 'Trinidad y Tobago', 'Túnez',
  'Turkmenistán', 'Turquía', 'Tuvalu', 'Ucrania', 'Uganda', 'Uruguay', 'Uzbekistán', 'Vanuatu',
  'Venezuela', 'Vietnam', 'Yemen', 'Yibuti', 'Zambia', 'Zimbabue',
] as const

export const EQUIPMENT_STATES = [
  'Almacen', 'Asignado', 'Pendiente', 'Transito', 'Reparacion', 'Extraviado', 'Robado', 'Baja',
] as const

export const DYMO_URL = 'https://127.0.0.1:41951'
export const DYMO_PRINTER = 'DYMO LabelWriter 550'
export const DYMO_DLS_PRINT = DYMO_URL + '/DYMO/DLS/Printing/PrintLabel'

export const DYMO_SKU_MAP: Record<string, string> = {
  'S0722560': '11356 Name Badge',
  'S0722400': '99012 Address',
  'S0722370': '99010 Address',
  'S0720030': '30256 Shipping',
  'S0722520': '11352 Return Address',
  'S0722550': '11355 Multi-Purpose',
  'S0722530': '11353 Multi-Purpose',
  'S0722390': '99015 Lever Arch',
}

export const DYMO_PAPER_FALLBACKS = [
  '11356 Name Badge',
  'S0722560',
  '11356',
  'Small Name Badge',
  'Name Badge 89 x 41',
]
