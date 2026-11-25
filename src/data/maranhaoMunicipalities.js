// Base geográfica dos 217 municípios do Estado do Maranhão (UF 21 - IBGE)
// Formato compacto: [codigoIbge, nome, latitude, longitude]

export const MARANHAO_CENTER = [-4.9609, -45.2744];
export const MARANHAO_BOUNDS = [
  [-10.65, -48.95],
  [-0.95, -41.6]
];

const RAW_MA_MUNICIPALITIES = [
  [
    "2100055",
    "Açailândia",
    -4.94714,
    -47.5004
  ],
  [
    "2100105",
    "Afonso Cunha",
    -4.13631,
    -43.3275
  ],
  [
    "2100154",
    "Água Doce do Maranhão",
    -2.84048,
    -42.1189
  ],
  [
    "2100204",
    "Alcântara",
    -2.39574,
    -44.4062
  ],
  [
    "2100303",
    "Aldeias Altas",
    -4.62621,
    -43.4689
  ],
  [
    "2100402",
    "Altamira do Maranhão",
    -4.16598,
    -45.4706
  ],
  [
    "2100436",
    "Alto Alegre do Maranhão",
    -4.213,
    -44.446
  ],
  [
    "2100477",
    "Alto Alegre do Pindaré",
    -3.66689,
    -45.8421
  ],
  [
    "2100501",
    "Alto Parnaíba",
    -9.10273,
    -45.9303
  ],
  [
    "2100550",
    "Amapá do Maranhão",
    -1.67524,
    -46.0024
  ],
  [
    "2100600",
    "Amarante do Maranhão",
    -5.56913,
    -46.7473
  ],
  [
    "2100709",
    "Anajatuba",
    -3.26269,
    -44.6126
  ],
  [
    "2100808",
    "Anapurus",
    -3.67577,
    -43.1014
  ],
  [
    "2100832",
    "Apicum-Açu",
    -1.45862,
    -45.0864
  ],
  [
    "2100873",
    "Araguanã",
    -2.94644,
    -45.6589
  ],
  [
    "2100907",
    "Araioses",
    -2.89091,
    -41.905
  ],
  [
    "2100956",
    "Arame",
    -4.88347,
    -46.0032
  ],
  [
    "2101004",
    "Arari",
    -3.45214,
    -44.7665
  ],
  [
    "2101103",
    "Axixá",
    -2.83939,
    -44.062
  ],
  [
    "2101202",
    "Bacabal",
    -4.22447,
    -44.7832
  ],
  [
    "2101251",
    "Bacabeira",
    -2.96452,
    -44.3164
  ],
  [
    "2101301",
    "Bacuri",
    -1.6965,
    -45.1328
  ],
  [
    "2101350",
    "Bacurituba",
    -2.71,
    -44.7329
  ],
  [
    "2101400",
    "Balsas",
    -7.53214,
    -46.0372
  ],
  [
    "2101509",
    "Barão de Grajaú",
    -6.74463,
    -43.0261
  ],
  [
    "2101608",
    "Barra do Corda",
    -5.49682,
    -45.2485
  ],
  [
    "2101707",
    "Barreirinhas",
    -2.75863,
    -42.8232
  ],
  [
    "2101772",
    "Bela Vista do Maranhão",
    -3.72618,
    -45.3075
  ],
  [
    "2101731",
    "Belágua",
    -3.15485,
    -43.5122
  ],
  [
    "2101806",
    "Benedito Leite",
    -7.21037,
    -44.5577
  ],
  [
    "2101905",
    "Bequimão",
    -2.44162,
    -44.7842
  ],
  [
    "2101939",
    "Bernardo do Mearim",
    -4.62666,
    -44.7608
  ],
  [
    "2101970",
    "Boa Vista do Gurupi",
    -1.77614,
    -46.3002
  ],
  [
    "2102002",
    "Bom Jardim",
    -3.54129,
    -45.606
  ],
  [
    "2102036",
    "Bom Jesus das Selvas",
    -4.47638,
    -46.8641
  ],
  [
    "2102077",
    "Bom Lugar",
    -4.37311,
    -45.0326
  ],
  [
    "2102101",
    "Brejo",
    -3.67796,
    -42.7527
  ],
  [
    "2102150",
    "Brejo de Areia",
    -4.334,
    -45.581
  ],
  [
    "2102200",
    "Buriti",
    -3.94169,
    -42.9179
  ],
  [
    "2102309",
    "Buriti Bravo",
    -5.83239,
    -43.8353
  ],
  [
    "2102325",
    "Buriticupu",
    -4.32375,
    -46.4409
  ],
  [
    "2102358",
    "Buritirana",
    -5.59823,
    -47.0131
  ],
  [
    "2102374",
    "Cachoeira Grande",
    -2.93074,
    -44.0528
  ],
  [
    "2102408",
    "Cajapió",
    -2.87326,
    -44.6741
  ],
  [
    "2102507",
    "Cajari",
    -3.32742,
    -45.0145
  ],
  [
    "2102556",
    "Campestre do Maranhão",
    -6.17075,
    -47.3625
  ],
  [
    "2102606",
    "Cândido Mendes",
    -1.43265,
    -45.7161
  ],
  [
    "2102705",
    "Cantanhede",
    -3.63757,
    -44.383
  ],
  [
    "2102754",
    "Capinzal do Norte",
    -4.7236,
    -44.328
  ],
  [
    "2102804",
    "Carolina",
    -7.33584,
    -47.4634
  ],
  [
    "2102903",
    "Carutapera",
    -1.19696,
    -46.0085
  ],
  [
    "2103000",
    "Caxias",
    -4.86505,
    -43.3617
  ],
  [
    "2103109",
    "Cedral",
    -2.00027,
    -44.5281
  ],
  [
    "2103125",
    "Central do Maranhão",
    -2.19831,
    -44.8254
  ],
  [
    "2103158",
    "Centro do Guilherme",
    -2.44891,
    -46.0345
  ],
  [
    "2103174",
    "Centro Novo do Maranhão",
    -2.12696,
    -46.1228
  ],
  [
    "2103208",
    "Chapadinha",
    -3.73875,
    -43.3538
  ],
  [
    "2103257",
    "Cidelândia",
    -5.17465,
    -47.7781
  ],
  [
    "2103307",
    "Codó",
    -4.45562,
    -43.8924
  ],
  [
    "2103406",
    "Coelho Neto",
    -4.25245,
    -43.0108
  ],
  [
    "2103505",
    "Colinas",
    -6.03199,
    -44.2543
  ],
  [
    "2103554",
    "Conceição do Lago-Açu",
    -3.85142,
    -44.8895
  ],
  [
    "2103604",
    "Coroatá",
    -4.13442,
    -44.1244
  ],
  [
    "2103703",
    "Cururupu",
    -1.81475,
    -44.8644
  ],
  [
    "2103752",
    "Davinópolis",
    -5.54637,
    -47.4217
  ],
  [
    "2103802",
    "Dom Pedro",
    -5.03518,
    -44.4409
  ],
  [
    "2103901",
    "Duque Bacelar",
    -4.15002,
    -42.9477
  ],
  [
    "2104008",
    "Esperantinópolis",
    -4.87938,
    -44.6926
  ],
  [
    "2104057",
    "Estreito",
    -6.56077,
    -47.4431
  ],
  [
    "2104073",
    "Feira Nova do Maranhão",
    -6.96508,
    -46.6786
  ],
  [
    "2104081",
    "Fernando Falcão",
    -6.16207,
    -44.8979
  ],
  [
    "2104099",
    "Formosa da Serra Negra",
    -6.44017,
    -46.1916
  ],
  [
    "2104107",
    "Fortaleza dos Nogueiras",
    -6.95983,
    -46.1749
  ],
  [
    "2104206",
    "Fortuna",
    -5.72792,
    -44.1565
  ],
  [
    "2104305",
    "Godofredo Viana",
    -1.40259,
    -45.7795
  ],
  [
    "2104404",
    "Gonçalves Dias",
    -5.1475,
    -44.3013
  ],
  [
    "2104503",
    "Governador Archer",
    -5.02078,
    -44.2754
  ],
  [
    "2104552",
    "Governador Edison Lobão",
    -5.74973,
    -47.3646
  ],
  [
    "2104602",
    "Governador Eugênio Barros",
    -5.31897,
    -44.2469
  ],
  [
    "2104628",
    "Governador Luiz Rocha",
    -5.47835,
    -44.0774
  ],
  [
    "2104651",
    "Governador Newton Bello",
    -3.43245,
    -45.6619
  ],
  [
    "2104677",
    "Governador Nunes Freire",
    -2.12899,
    -45.8777
  ],
  [
    "2104701",
    "Graça Aranha",
    -5.40547,
    -44.3358
  ],
  [
    "2104800",
    "Grajaú",
    -5.81367,
    -46.1462
  ],
  [
    "2104909",
    "Guimarães",
    -2.12755,
    -44.602
  ],
  [
    "2105005",
    "Humberto de Campos",
    -2.59828,
    -43.4649
  ],
  [
    "2105104",
    "Icatu",
    -2.77206,
    -44.0501
  ],
  [
    "2105153",
    "Igarapé do Meio",
    -3.65771,
    -45.2114
  ],
  [
    "2105203",
    "Igarapé Grande",
    -4.6625,
    -44.8558
  ],
  [
    "2105302",
    "Imperatriz",
    -5.51847,
    -47.4777
  ],
  [
    "2105351",
    "Itaipava do Grajaú",
    -5.14252,
    -45.7877
  ],
  [
    "2105401",
    "Itapecuru Mirim",
    -3.40202,
    -44.3508
  ],
  [
    "2105427",
    "Itinga do Maranhão",
    -4.45293,
    -47.5235
  ],
  [
    "2105450",
    "Jatobá",
    -5.82282,
    -44.2153
  ],
  [
    "2105476",
    "Jenipapo dos Vieiras",
    -5.36237,
    -45.6356
  ],
  [
    "2105500",
    "João Lisboa",
    -5.44363,
    -47.4064
  ],
  [
    "2105609",
    "Joselândia",
    -4.98611,
    -44.6958
  ],
  [
    "2105658",
    "Junco do Maranhão",
    -1.83888,
    -46.09
  ],
  [
    "2105708",
    "Lago da Pedra",
    -4.56974,
    -45.1319
  ],
  [
    "2105807",
    "Lago do Junco",
    -4.609,
    -45.049
  ],
  [
    "2105948",
    "Lago dos Rodrigues",
    -4.61173,
    -44.9798
  ],
  [
    "2105906",
    "Lago Verde",
    -3.94661,
    -44.826
  ],
  [
    "2105922",
    "Lagoa do Mato",
    -6.05023,
    -43.5333
  ],
  [
    "2105963",
    "Lagoa Grande do Maranhão",
    -4.98893,
    -45.3816
  ],
  [
    "2105989",
    "Lajeado Novo",
    -6.18539,
    -47.0293
  ],
  [
    "2106003",
    "Lima Campos",
    -4.51837,
    -44.4646
  ],
  [
    "2106102",
    "Loreto",
    -7.08111,
    -45.1451
  ],
  [
    "2106201",
    "Luís Domingues",
    -1.27492,
    -45.867
  ],
  [
    "2106300",
    "Magalhães de Almeida",
    -3.39232,
    -42.2117
  ],
  [
    "2106326",
    "Maracaçumé",
    -2.04918,
    -45.9587
  ],
  [
    "2106359",
    "Marajá do Sena",
    -4.62806,
    -45.4531
  ],
  [
    "2106375",
    "Maranhãozinho",
    -2.24078,
    -45.8507
  ],
  [
    "2106409",
    "Mata Roma",
    -3.62035,
    -43.1112
  ],
  [
    "2106508",
    "Matinha",
    -3.09849,
    -45.035
  ],
  [
    "2106607",
    "Matões",
    -5.51359,
    -43.2018
  ],
  [
    "2106631",
    "Matões do Norte",
    -3.6244,
    -44.5468
  ],
  [
    "2106672",
    "Milagres do Maranhão",
    -3.57443,
    -42.6131
  ],
  [
    "2106706",
    "Mirador",
    -6.37454,
    -44.3683
  ],
  [
    "2106755",
    "Miranda do Norte",
    -3.56313,
    -44.5814
  ],
  [
    "2106805",
    "Mirinzal",
    -2.07094,
    -44.7787
  ],
  [
    "2106904",
    "Monção",
    -3.48125,
    -45.2496
  ],
  [
    "2107001",
    "Montes Altos",
    -5.83067,
    -47.0673
  ],
  [
    "2107100",
    "Morros",
    -2.85379,
    -44.0357
  ],
  [
    "2107209",
    "Nina Rodrigues",
    -3.46788,
    -43.9134
  ],
  [
    "2107258",
    "Nova Colinas",
    -7.12263,
    -46.2607
  ],
  [
    "2107308",
    "Nova Iorque",
    -6.73047,
    -44.0471
  ],
  [
    "2107357",
    "Nova Olinda do Maranhão",
    -2.84227,
    -45.6953
  ],
  [
    "2107407",
    "Olho d'Água das Cunhãs",
    -4.13417,
    -45.1163
  ],
  [
    "2107456",
    "Olinda Nova do Maranhão",
    -2.99295,
    -44.9897
  ],
  [
    "2107506",
    "Paço do Lumiar",
    -2.51657,
    -44.1019
  ],
  [
    "2107605",
    "Palmeirândia",
    -2.64433,
    -44.8933
  ],
  [
    "2107704",
    "Paraibano",
    -6.4264,
    -43.9792
  ],
  [
    "2107803",
    "Parnarama",
    -5.67365,
    -43.1011
  ],
  [
    "2107902",
    "Passagem Franca",
    -6.17745,
    -43.7755
  ],
  [
    "2108009",
    "Pastos Bons",
    -6.60296,
    -44.0745
  ],
  [
    "2108058",
    "Paulino Neves",
    -2.72094,
    -42.5258
  ],
  [
    "2108108",
    "Paulo Ramos",
    -4.44485,
    -45.2398
  ],
  [
    "2108207",
    "Pedreiras",
    -4.56482,
    -44.6006
  ],
  [
    "2108256",
    "Pedro do Rosário",
    -2.97272,
    -45.3493
  ],
  [
    "2108306",
    "Penalva",
    -3.27674,
    -45.1768
  ],
  [
    "2108405",
    "Peri Mirim",
    -2.57676,
    -44.8504
  ],
  [
    "2108454",
    "Peritoró",
    -4.37459,
    -44.3369
  ],
  [
    "2108504",
    "Pindaré-Mirim",
    -3.60985,
    -45.342
  ],
  [
    "2108603",
    "Pinheiro",
    -2.52224,
    -45.0788
  ],
  [
    "2108702",
    "Pio XII",
    -3.89315,
    -45.1759
  ],
  [
    "2108801",
    "Pirapemas",
    -3.72041,
    -44.2216
  ],
  [
    "2108900",
    "Poção de Pedras",
    -4.74626,
    -44.9432
  ],
  [
    "2109007",
    "Porto Franco",
    -6.34149,
    -47.3962
  ],
  [
    "2109056",
    "Porto Rico do Maranhão",
    -1.85925,
    -44.5842
  ],
  [
    "2109106",
    "Presidente Dutra",
    -5.2898,
    -44.495
  ],
  [
    "2109205",
    "Presidente Juscelino",
    -2.91872,
    -44.0715
  ],
  [
    "2109239",
    "Presidente Médici",
    -2.38991,
    -45.82
  ],
  [
    "2109270",
    "Presidente Sarney",
    -2.58799,
    -45.3595
  ],
  [
    "2109304",
    "Presidente Vargas",
    -3.40787,
    -44.0234
  ],
  [
    "2109403",
    "Primeira Cruz",
    -2.50568,
    -43.4232
  ],
  [
    "2109452",
    "Raposa",
    -2.4254,
    -44.0973
  ],
  [
    "2109502",
    "Riachão",
    -7.35819,
    -46.6225
  ],
  [
    "2109551",
    "Ribamar Fiquene",
    -5.93067,
    -47.3888
  ],
  [
    "2109601",
    "Rosário",
    -2.93444,
    -44.2531
  ],
  [
    "2109700",
    "Sambaíba",
    -7.13447,
    -45.3515
  ],
  [
    "2109759",
    "Santa Filomena do Maranhão",
    -5.49671,
    -44.5638
  ],
  [
    "2109809",
    "Santa Helena",
    -2.24426,
    -45.29
  ],
  [
    "2109908",
    "Santa Inês",
    -3.65112,
    -45.3774
  ],
  [
    "2110005",
    "Santa Luzia",
    -4.06873,
    -45.69
  ],
  [
    "2110039",
    "Santa Luzia do Paruá",
    -2.51123,
    -45.7801
  ],
  [
    "2110104",
    "Santa Quitéria do Maranhão",
    -3.49308,
    -42.5688
  ],
  [
    "2110203",
    "Santa Rita",
    -3.14241,
    -44.3211
  ],
  [
    "2110237",
    "Santana do Maranhão",
    -3.109,
    -42.4064
  ],
  [
    "2110278",
    "Santo Amaro do Maranhão",
    -2.50068,
    -43.238
  ],
  [
    "2110302",
    "Santo Antônio dos Lopes",
    -4.86613,
    -44.3653
  ],
  [
    "2110401",
    "São Benedito do Rio Preto",
    -3.33515,
    -43.5287
  ],
  [
    "2110500",
    "São Bento",
    -2.69781,
    -44.8289
  ],
  [
    "2110609",
    "São Bernardo",
    -3.37223,
    -42.4191
  ],
  [
    "2110658",
    "São Domingos do Azeitão",
    -6.81471,
    -44.6509
  ],
  [
    "2110708",
    "São Domingos do Maranhão",
    -5.58095,
    -44.3822
  ],
  [
    "2110807",
    "São Félix de Balsas",
    -7.07535,
    -44.8092
  ],
  [
    "2110856",
    "São Francisco do Brejão",
    -5.12584,
    -47.389
  ],
  [
    "2110906",
    "São Francisco do Maranhão",
    -6.25159,
    -42.8668
  ],
  [
    "2111003",
    "São João Batista",
    -2.95398,
    -44.7953
  ],
  [
    "2111029",
    "São João do Carú",
    -3.5503,
    -46.2507
  ],
  [
    "2111052",
    "São João do Paraíso",
    -6.45634,
    -47.0594
  ],
  [
    "2111078",
    "São João do Soter",
    -5.10821,
    -43.8163
  ],
  [
    "2111102",
    "São João dos Patos",
    -6.4934,
    -43.7036
  ],
  [
    "2111201",
    "São José de Ribamar",
    -2.54704,
    -44.0597
  ],
  [
    "2111250",
    "São José dos Basílios",
    -5.05493,
    -44.5809
  ],
  [
    "2111300",
    "São Luís",
    -2.53874,
    -44.2825
  ],
  [
    "2111409",
    "São Luís Gonzaga do Maranhão",
    -4.38541,
    -44.6654
  ],
  [
    "2111508",
    "São Mateus do Maranhão",
    -4.03736,
    -44.4707
  ],
  [
    "2111532",
    "São Pedro da Água Branca",
    -5.08472,
    -48.4291
  ],
  [
    "2111573",
    "São Pedro dos Crentes",
    -6.82389,
    -46.5319
  ],
  [
    "2111607",
    "São Raimundo das Mangabeiras",
    -7.02183,
    -45.4809
  ],
  [
    "2111631",
    "São Raimundo do Doca Bezerra",
    -5.11053,
    -45.0696
  ],
  [
    "2111672",
    "São Roberto",
    -5.0231,
    -45.001
  ],
  [
    "2111706",
    "São Vicente Ferrer",
    -2.89487,
    -44.8681
  ],
  [
    "2111722",
    "Satubinha",
    -4.04913,
    -45.2457
  ],
  [
    "2111748",
    "Senador Alexandre Costa",
    -5.25096,
    -44.0533
  ],
  [
    "2111763",
    "Senador La Rocque",
    -5.4461,
    -47.2959
  ],
  [
    "2111789",
    "Serrano do Maranhão",
    -1.85229,
    -45.1207
  ],
  [
    "2111805",
    "Sítio Novo",
    -5.87601,
    -46.7033
  ],
  [
    "2111904",
    "Sucupira do Norte",
    -6.47839,
    -44.1919
  ],
  [
    "2111953",
    "Sucupira do Riachão",
    -6.40858,
    -43.5455
  ],
  [
    "2112001",
    "Tasso Fragoso",
    -8.4662,
    -45.7536
  ],
  [
    "2112100",
    "Timbiras",
    -4.25597,
    -43.932
  ],
  [
    "2112209",
    "Timon",
    -5.09769,
    -42.8329
  ],
  [
    "2112233",
    "Trizidela do Vale",
    -4.538,
    -44.628
  ],
  [
    "2112274",
    "Tufilândia",
    -3.67355,
    -45.6238
  ],
  [
    "2112308",
    "Tuntum",
    -5.25476,
    -44.6444
  ],
  [
    "2112407",
    "Turiaçu",
    -1.65893,
    -45.3798
  ],
  [
    "2112456",
    "Turilândia",
    -2.21638,
    -45.3044
  ],
  [
    "2112506",
    "Tutóia",
    -2.76141,
    -42.2755
  ],
  [
    "2112605",
    "Urbano Santos",
    -3.20642,
    -43.3878
  ],
  [
    "2112704",
    "Vargem Grande",
    -3.53639,
    -43.917
  ],
  [
    "2112803",
    "Viana",
    -3.20451,
    -44.9912
  ],
  [
    "2112852",
    "Vila Nova dos Martírios",
    -5.18889,
    -48.1336
  ],
  [
    "2112902",
    "Vitória do Mearim",
    -3.45125,
    -44.8643
  ],
  [
    "2113009",
    "Vitorino Freire",
    -4.28184,
    -45.2505
  ],
  [
    "2114007",
    "Zé Doca",
    -3.27014,
    -45.6553
  ]
];

export const MARANHAO_MUNICIPALITIES = RAW_MA_MUNICIPALITIES.map(
  ([codigoIbge, nome, lat, lng]) => ({
    codigoIbge,
    nome,
    lat,
    lng
  })
);

export function normalizeMaranhaoName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const BY_NORMALIZED_NAME = new Map(
  MARANHAO_MUNICIPALITIES.map((item) => [normalizeMaranhaoName(item.nome), item])
);

export function findMaranhaoMunicipality(name) {
  const key = normalizeMaranhaoName(name);
  if (!key) return null;
  if (BY_NORMALIZED_NAME.has(key)) {
    return BY_NORMALIZED_NAME.get(key);
  }
  // Fallback: remove sufixos comuns tipo " - MA" ou "/MA"
  const stripped = key.replace(/\s*[-/]\s*ma$/i, '').trim();
  return BY_NORMALIZED_NAME.get(stripped) || null;
}

export function isWithinMaranhaoBounds(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  return (
    nLat >= MARANHAO_BOUNDS[0][0] &&
    nLat <= MARANHAO_BOUNDS[1][0] &&
    nLng >= MARANHAO_BOUNDS[0][1] &&
    nLng <= MARANHAO_BOUNDS[1][1]
  );
}

export function resolveUnitCoordinates(unit) {
  if (!unit) return null;
  const lat = Number(unit.latitude);
  const lng = Number(unit.longitude);
  if (
    unit.latitude !== null &&
    unit.latitude !== '' &&
    unit.longitude !== null &&
    unit.longitude !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return {
      lat,
      lng,
      precision: unit.geocodePrecision || 'exata',
      municipioNome: unit.municipio || ''
    };
  }
  const city = findMaranhaoMunicipality(unit.municipio);
  if (!city) return null;
  return {
    lat: city.lat,
    lng: city.lng,
    precision: 'municipio',
    municipioNome: city.nome
  };
}
