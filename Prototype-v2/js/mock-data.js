/* 엘리베이터 지하철 — 목업 데이터 (v2)
 * 대상 노선: 1~8호선 (REQ-MAP-002)
 * 좌표: 서울교통공사 「수도권 지하철 노선도」(공공누리 제1유형) PDF의 역 위치를 그대로 옮긴 값 (REQ-MAP-001)
 *       지도 좌표 = PDF 좌표 - (305, 332), 축척 1:1
 *       환승역은 원본의 환승 표시(캡슐) 중심점을 쓴다.
 * 이 파일은 DOM에 접근하지 않는다. */
(function () {
  'use strict';

  var lines = {
    "1": {
      id: "1", name: "1호선", short: "1", color: "#0052A4",
      loop: false,
      segments: [
        ["changdong", "nokcheon", "wolgye", "kwangwoon_univ", "seokgye", "sinimun", "hufs", "hoegi", "cheongnyangni", "jegi", "sinseoldong", "dongmyo", "dongdaemun", "jongno5ga", "jongno3ga", "jonggak", "cityhall", "seoul", "namyeong", "yongsan", "noryangjin", "daebang", "singil", "yeongdeungpo", "sindorim", "guro", "gasan_digital", "doksan"],
        ["guro", "guil", "gaebong", "oryu_dong", "onsu"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M318.6 1305.3L525.5 1303.3L528.2 1301.1L637.4 1194.8L640.8 1194.4L836.4 1193.8L843.1 1189.3L846.3 1181.7L848.5 941.7L850.6 939L931.5 855.3L931.9 851.9L929.9 765.2L922 756.7L746.2 578L745.7 574.6L746.5 419.6L751 412.8L758.6 409.7L1408.5 407.6L1411.2 405.5L1455 359.1L1455.5 355.7L1456.3 70.8",
        "M471.7 1305.4L471.7 1447.5"
      ]
    },
    "2": {
      id: "2", name: "2호선", short: "2", color: "#00A84D",
      loop: true,
      segments: [
        ["cityhall", "euljiro1ga", "euljiro3ga", "euljiro4ga", "ddp", "sindang", "sangwangsimni", "wangsimni", "hanyang_univ", "ttukseom", "seongsu", "konkuk", "guui", "gangbyeon", "jamsilnaru", "jamsil", "jamsilsaenae", "sports_complex", "samseong", "seolleung", "yeoksam", "gangnam", "gyodae", "seocho", "bangbae", "sadang", "nakseongdae", "seoul_univ", "bongcheon", "sillim", "sindaebang", "guro_digital", "daerim", "sindorim", "mullae", "yeongdeungpo_gu", "dangsan", "hapjeong", "hongik", "sinchon", "ewha", "ahyeon", "chungjeongno"],
        ["seongsu", "yongdap", "sindap", "yongdu", "sinseoldong"],
        ["sindorim", "dorimcheon", "yangcheon_gu", "sinjeongnegeori", "kkachisan"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M1495.5 1008.4L1492.8 1062L1484.8 1114.1L1471.9 1164.4L1454.2 1212.7L1432.1 1258.6L1405.8 1301.8L1375.6 1342.2L1341.7 1379.5L1304.5 1413.4L1264.1 1443.6L1220.8 1469.9L1174.9 1492L1126.7 1509.7L1076.4 1522.6L1024.3 1530.5L970.6 1533.2L916.9 1530.5L864.8 1522.6L814.5 1509.7L766.3 1492L720.4 1469.9L677.1 1443.6L636.7 1413.4L599.4 1379.5L565.6 1342.2L535.3 1301.8L509.1 1258.6L487 1212.7L469.3 1164.4L456.4 1114.1L448.4 1062L445.7 1008.4L448.2 956.5L455.7 906.1L467.7 857.4L484.2 810.6L504.9 766L529.5 723.7L557.9 684L589.7 647.2L624.7 613.5L662.8 583.2L703.5 556.4L746.9 533.4L792.5 514.5L840.1 499.8L889.6 489.7L970.6 483.5L1014.2 485.3L1065.1 492L1106.3 501.2L1147.6 514.1L1187.4 530.2L1225.5 549.4L1261.7 571.5L1295.9 596.4L1327.9 623.9L1357.7 653.9L1384.9 686.1L1409.6 720.5L1431.4 756.9L1450.4 795.1L1466.2 835L1478.8 876.5L1487.9 919.3L1493.6 963.3L1495.5 1008.4Z",
        "M1545.5 731.5L1554 722.2L1555.5 714.2L1552.4 706.6L1270.3 424.4",
        "M275.3 979.5L277.3 1064.4L279.4 1067.2L507.5 1292.3L511 1292.8L535.8 1292.7"
      ]
    },
    "3": {
      id: "3", name: "3호선", short: "3", color: "#EF7C1C",
      loop: false,
      segments: [
        ["gupabal", "yeonsinnae", "bulgwang", "nokbeon", "hongje", "muakjae", "dongnimmun", "gyeongbokgung", "anguk", "jongno3ga", "euljiro3ga", "chungmuro", "dongguk_univ", "yaksu", "geumho", "oksu", "apgujeong", "sinsa", "jamwon", "express_bus", "gyodae", "nambu_terminal", "yangjae", "maebong", "dogok", "daechi", "hangnyeoul", "daecheong", "irwon", "suseo", "garak_market", "ogeum"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M1722.1 1392.8L1530.7 1581.4L1527.3 1581.9L1476.1 1582.3L1139.5 1581.7L1132.8 1577.2L1129.6 1569.6L1127.6 783.9L1125.5 781.2L868.2 521L867.8 517.6L865.8 330.3L863.7 327.6L719.7 186.5L716.2 186L514.4 186"
      ]
    },
    "4": {
      id: "4", name: "4호선", short: "4", color: "#00A5DE",
      loop: false,
      segments: [
        ["nowon", "changdong", "ssangmun", "suyu", "mia", "miasageori", "gireum", "sungshin", "hansung", "hyehwa", "dongdaemun", "ddp", "chungmuro", "myeongdong", "hoehyeon", "seoul", "sookmyung", "samgakji", "sinyongsan", "ichon", "dongjak", "isu", "sadang", "namtaeryeong"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M944 1599.4L945.9 632.8L948.1 630.1L1063.3 512.5L1063.7 509L1063.7 398.9L1384.3 81.1L1387.8 80.7L1623.1 80.7"
      ]
    },
    "5": {
      id: "5", name: "5호선", short: "5", color: "#996CAC",
      loop: false,
      segments: [
        ["gimpo_airport", "songjeong", "magok", "balsan", "ujangsan", "hwagok", "kkachisan", "sinjeong", "mokdong", "omokgyo", "yangpyeong", "yeongdeungpo_gu", "yeongdeungpo_market", "singil", "yeouido", "yeouinaru", "mapo", "gongdeok", "aeogae", "chungjeongno", "seodaemun", "gwanghwamun", "jongno3ga", "euljiro4ga", "ddp", "cheonggu", "singeumho", "haengdang", "wangsimni", "majang", "dapsimni", "janghanpyeong", "gunja", "achasan", "gwangnaru", "cheonho", "gangdong", "gildong", "gubeundari", "myeongil", "godeok", "sangil_dong"],
        ["gangdong", "dunchon_dong", "olympic_park", "bangi", "ogeum", "gaerong", "geoyeo", "macheon"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M1839.4 1392.5L1703.9 1391.8L1697.2 1387.3L1694 1379.7L1693.3 645.4L1688.8 638.7L1681.2 635.5L1149.4 634.7L1142.6 630.1L1139.5 622.6L1138.7 532.3L1132.8 524.7L1087.3 511.2L1038.2 502.1L966.4 494.1L965.8 431.7L961.3 425L953.7 421.8L693.4 422.4L686.7 426.9L683.5 434.5L682.8 1172.1L678.3 1178.8L670.7 1182L475.2 1180L472.5 1177.9L71.3 773.9L70.9 770.4L70.9 605.6",
        "M1693.8 1029.2L1868.7 854.2"
      ]
    },
    "6": {
      id: "6", name: "6호선", short: "6", color: "#CD7C2F",
      loop: false,
      segments: [
        ["gusan", "eungam", "saejeol", "jeungsan", "dmc", "worldcup_stadium", "mapo_gu_office", "mangwon", "hapjeong", "sangsu", "gwangheungchang", "daeheung", "gongdeok", "hyochang_park", "samgakji", "noksapyeong", "itaewon", "hangangjin", "beotigogae", "yaksu", "cheonggu", "sindang", "dongmyo", "changsin", "bomun", "anam", "korea_univ", "wolgok", "sangwolgok", "dolgoji", "seokgye", "taereung", "hwarangdae", "bonghwasan"],
        ["eungam", "yeokchon", "bulgwang", "dokbawi", "yeonsinnae", "gusan"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M1744.5 283.9L1706.1 248.8L1325.8 250.4L1323 252.6L1184.2 394.3L1183.8 397.7L1181.7 735.3L1179.6 738L969.1 945.7L965.6 946.1L531.2 944.1L528.4 942L352.1 762.8L351.6 759.3L353.6 519.9L355.8 517.1L647.7 225.1",
        "M633.4 239.5L630.7 230.3L595.8 193.4L594.2 185L596.6 178.2L629 145.8L637.2 143.4L644.1 145.1L647.8 147.7L678.6 179.5L680.2 187.9L677.8 194.6L633.4 239.5Z"
      ]
    },
    "7": {
      id: "7", name: "7호선", short: "7", color: "#747F00",
      loop: false,
      segments: [
        ["nowon", "junggye", "hagye", "gongneung", "taereung", "meokgol", "junghwa", "sangbong", "myeonmok", "sagajeong", "yongmasan", "junggok", "gunja", "children_park", "konkuk", "ttukseom_park", "cheongdam", "gangnam_gu_office", "hak_dong", "nonhyeon", "banpo", "express_bus", "naebang", "isu", "namseong", "soongsil", "sangdo", "jangseungbaegi", "sindaebang_samgeori", "boramae", "sinpung", "daerim", "namguro", "gasan_digital", "cheolsan", "gwangmyeong_sageori", "cheonwang", "onsu"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M1621.9 71L1623 76.3L1621.2 768.2L1619 770.9L1015.2 1371.9L1011.8 1372.3L383.8 1370.3L381.1 1368.2L325.5 1312.6"
      ]
    },
    "8": {
      id: "8", name: "8호선", short: "8", color: "#E6186C",
      loop: false,
      segments: [
        ["amsa", "cheonho", "gangdong_gu_office", "mongchontoseong", "jamsil", "seokchon", "songpa", "garak_market", "munjeong", "jangji", "bokjeong", "sanseong", "namhansanseong", "dandaeogeori", "sinheung", "sujin", "moran"]
      ],
      // 노선 모양 (원본 노선도에서 추출한 SVG path, 지도 좌표)
      paths: [
        "M1750.3 1693.6L1803.7 1693.4L1809.5 1691.1L1813.6 1686.7L1815.5 1681L1814.9 1675L1811.4 1669.4L1580.7 1435.8L1580.2 1432.4L1578.1 1205.3L1576 1202.6L1498 1121.8L1501.8 1108.1L1729 880.8"
      ]
    }
  };

  var stations = {
    "cityhall": { id: "cityhall", name: "시청", x: 746.1, y: 528.7, lines: ["1", "2"] },
    "euljiro1ga": { id: "euljiro1ga", name: "을지로입구", x: 803.5, y: 510.5, lines: ["2"] },
    "euljiro3ga": { id: "euljiro3ga", name: "을지로3가", x: 867.8, y: 488.5, lines: ["2", "3"] },
    "euljiro4ga": { id: "euljiro4ga", name: "을지로4가", x: 966.5, y: 478.3, lines: ["2", "5"] },
    "ddp": { id: "ddp", name: "동대문역사문화공원", x: 1063.8, y: 492.3, lines: ["2", "4", "5"] },
    "sindang": { id: "sindang", name: "신당", x: 1183.8, y: 522.3, lines: ["2", "6"] },
    "sangwangsimni": { id: "sangwangsimni", name: "상왕십리", x: 1260.2, y: 570.5, lines: ["2"] },
    "wangsimni": { id: "wangsimni", name: "왕십리", x: 1348.2, y: 635.3, lines: ["2", "5"] },
    "hanyang_univ": { id: "hanyang_univ", name: "한양대", x: 1404.6, y: 712.8, lines: ["2"] },
    "ttukseom": { id: "ttukseom", name: "뚝섬", x: 1432, y: 758.9, lines: ["2"] },
    "seongsu": { id: "seongsu", name: "성수", x: 1459.5, y: 816.2, lines: ["2"] },
    "konkuk": { id: "konkuk", name: "건대입구", x: 1489, y: 900.5, lines: ["2", "7"] },
    "guui": { id: "guui", name: "구의", x: 1492.6, y: 947.1, lines: ["2"] },
    "gangbyeon": { id: "gangbyeon", name: "강변", x: 1494.9, y: 995.2, lines: ["2"] },
    "jamsilnaru": { id: "jamsilnaru", name: "잠실나루", x: 1492.1, y: 1072.1, lines: ["2"] },
    "jamsil": { id: "jamsil", name: "잠실", x: 1489.4, y: 1116.3, lines: ["2", "8"] },
    "jamsilsaenae": { id: "jamsilsaenae", name: "잠실새내", x: 1465.2, y: 1184.3, lines: ["2"] },
    "sports_complex": { id: "sports_complex", name: "종합운동장", x: 1437.8, y: 1257.9, lines: ["2"] },
    "samseong": { id: "samseong", name: "삼성", x: 1376.9, y: 1340.6, lines: ["2"] },
    "seolleung": { id: "seolleung", name: "선릉", x: 1306.7, y: 1417.1, lines: ["2"] },
    "yeoksam": { id: "yeoksam", name: "역삼", x: 1259.2, y: 1446.2, lines: ["2"] },
    "gangnam": { id: "gangnam", name: "강남", x: 1208.5, y: 1482.2, lines: ["2"] },
    "gyodae": { id: "gyodae", name: "교대", x: 1129.6, y: 1514.6, lines: ["2", "3"] },
    "seocho": { id: "seocho", name: "서초", x: 1080.1, y: 1521.4, lines: ["2"] },
    "bangbae": { id: "bangbae", name: "방배", x: 1031.8, y: 1529.5, lines: ["2"] },
    "sadang": { id: "sadang", name: "사당", x: 943.9, y: 1537.8, lines: ["2", "4"] },
    "nakseongdae": { id: "nakseongdae", name: "낙성대", x: 884.5, y: 1526.4, lines: ["2"] },
    "seoul_univ": { id: "seoul_univ", name: "서울대입구", x: 811.5, y: 1509.5, lines: ["2"] },
    "bongcheon": { id: "bongcheon", name: "봉천", x: 757.7, y: 1488.1, lines: ["2"] },
    "sillim": { id: "sillim", name: "신림", x: 705.2, y: 1466.8, lines: ["2"] },
    "sindaebang": { id: "sindaebang", name: "신대방", x: 669.9, y: 1438.1, lines: ["2"] },
    "guro_digital": { id: "guro_digital", name: "구로디지털단지", x: 629.5, y: 1407.3, lines: ["2"] },
    "daerim": { id: "daerim", name: "대림", x: 586.5, y: 1372.3, lines: ["2", "7"] },
    "sindorim": { id: "sindorim", name: "신도림", x: 528.5, y: 1298.1, lines: ["1", "2"] },
    "mullae": { id: "mullae", name: "문래", x: 494.4, y: 1229.1, lines: ["2"] },
    "yeongdeungpo_gu": { id: "yeongdeungpo_gu", name: "영등포구청", x: 471, y: 1176.1, lines: ["2", "5"] },
    "dangsan": { id: "dangsan", name: "당산", x: 441.7, y: 1002.5, lines: ["2"] },
    "hapjeong": { id: "hapjeong", name: "합정", x: 458.5, y: 872.2, lines: ["2", "6"] },
    "hongik": { id: "hongik", name: "홍대입구", x: 496.9, y: 780.5, lines: ["2"] },
    "sinchon": { id: "sinchon", name: "신촌", x: 529.3, y: 724.4, lines: ["2"] },
    "ewha": { id: "ewha", name: "이대", x: 564.5, y: 674.8, lines: ["2"] },
    "ahyeon": { id: "ahyeon", name: "아현", x: 616.8, y: 619.7, lines: ["2"] },
    "chungjeongno": { id: "chungjeongno", name: "충정로", x: 683.4, y: 563.6, lines: ["2", "5"] },
    "yongdap": { id: "yongdap", name: "용답", x: 1545.6, y: 731.6, lines: ["2"] },
    "sindap": { id: "sindap", name: "신답", x: 1444.9, y: 599.2, lines: ["2"] },
    "yongdu": { id: "yongdu", name: "용두", x: 1352.1, y: 506.2, lines: ["2"] },
    "sinseoldong": { id: "sinseoldong", name: "신설동", x: 1270.3, y: 409.5, lines: ["1", "2"] },
    "dorimcheon": { id: "dorimcheon", name: "도림천", x: 429.5, y: 1217.4, lines: ["2"] },
    "yangcheon_gu": { id: "yangcheon_gu", name: "양천구청", x: 379.1, y: 1166.8, lines: ["2"] },
    "sinjeongnegeori": { id: "sinjeongnegeori", name: "신정네거리", x: 296.4, y: 1083.9, lines: ["2"] },
    "kkachisan": { id: "kkachisan", name: "까치산", x: 275.6, y: 986.7, lines: ["2", "5"] },
    "changdong": { id: "changdong", name: "창동", x: 1455.5, y: 75.8, lines: ["1", "4"] },
    "nokcheon": { id: "nokcheon", name: "녹천", x: 1455.5, y: 117.5, lines: ["1"] },
    "wolgye": { id: "wolgye", name: "월계", x: 1455.5, y: 153.9, lines: ["1"] },
    "kwangwoon_univ": { id: "kwangwoon_univ", name: "광운대", x: 1455.5, y: 186.6, lines: ["1"] },
    "seokgye": { id: "seokgye", name: "석계", x: 1455.5, y: 242.3, lines: ["1", "6"] },
    "sinimun": { id: "sinimun", name: "신이문", x: 1455.5, y: 283.4, lines: ["1"] },
    "hufs": { id: "hufs", name: "외대앞", x: 1455.5, y: 321.5, lines: ["1"] },
    "hoegi": { id: "hoegi", name: "회기", x: 1464.9, y: 367.8, lines: ["1"] },
    "cheongnyangni": { id: "cheongnyangni", name: "청량리", x: 1418.4, y: 421.1, lines: ["1"] },
    "jegi": { id: "jegi", name: "제기동", x: 1346.4, y: 409.5, lines: ["1"] },
    "dongmyo": { id: "dongmyo", name: "동묘앞", x: 1183.8, y: 404.1, lines: ["1", "6"] },
    "dongdaemun": { id: "dongdaemun", name: "동대문", x: 1063.8, y: 404.1, lines: ["1", "4"] },
    "jongno5ga": { id: "jongno5ga", name: "종로5가", x: 966.7, y: 409.5, lines: ["1"] },
    "jongno3ga": { id: "jongno3ga", name: "종로3가", x: 867.8, y: 408, lines: ["1", "3", "5"] },
    "jonggak": { id: "jonggak", name: "종각", x: 745.9, y: 456.3, lines: ["1"] },
    "seoul": { id: "seoul", name: "서울역", x: 920.5, y: 755.5, lines: ["1", "4"] },
    "namyeong": { id: "namyeong", name: "남영", x: 913.1, y: 876.4, lines: ["1"] },
    "yongsan": { id: "yongsan", name: "용산", x: 846.3, y: 1004.8, lines: ["1"] },
    "noryangjin": { id: "noryangjin", name: "노량진", x: 846.3, y: 1126.1, lines: ["1"] },
    "daebang": { id: "daebang", name: "대방", x: 762, y: 1199.4, lines: ["1"] },
    "singil": { id: "singil", name: "신길", x: 652.5, y: 1188.2, lines: ["1", "5"] },
    "yeongdeungpo": { id: "yeongdeungpo", name: "영등포", x: 585.7, y: 1243.7, lines: ["1"] },
    "guro": { id: "guro", name: "구로", x: 471.4, y: 1305.3, lines: ["1"] },
    "gasan_digital": { id: "gasan_digital", name: "가산디지털단지", x: 472, y: 1377.6, lines: ["1", "7"] },
    "doksan": { id: "doksan", name: "독산", x: 471.9, y: 1447.5, lines: ["1"] },
    "guil": { id: "guil", name: "구일", x: 442.8, y: 1305.3, lines: ["1"] },
    "gaebong": { id: "gaebong", name: "개봉", x: 405.4, y: 1305.3, lines: ["1"] },
    "oryu_dong": { id: "oryu_dong", name: "오류동", x: 371.4, y: 1305.3, lines: ["1"] },
    "onsu": { id: "onsu", name: "온수", x: 322.3, y: 1308.3, lines: ["1", "7"] },
    "gupabal": { id: "gupabal", name: "구파발", x: 514.4, y: 185.9, lines: ["3"] },
    "yeonsinnae": { id: "yeonsinnae", name: "연신내", x: 581.5, y: 185.9, lines: ["3", "6"] },
    "bulgwang": { id: "bulgwang", name: "불광", x: 685.5, y: 185.9, lines: ["3", "6"] },
    "nokbeon": { id: "nokbeon", name: "녹번", x: 734.2, y: 198.2, lines: ["3"] },
    "hongje": { id: "hongje", name: "홍제", x: 761.6, y: 225.6, lines: ["3"] },
    "muakjae": { id: "muakjae", name: "무악재", x: 789.7, y: 253.5, lines: ["3"] },
    "dongnimmun": { id: "dongnimmun", name: "독립문", x: 819.5, y: 283.4, lines: ["3"] },
    "gyeongbokgung": { id: "gyeongbokgung", name: "경복궁", x: 852.1, y: 315.9, lines: ["3"] },
    "anguk": { id: "anguk", name: "안국", x: 867.8, y: 349.4, lines: ["3"] },
    "chungmuro": { id: "chungmuro", name: "충무로", x: 963.8, y: 620.8, lines: ["3", "4"] },
    "dongguk_univ": { id: "dongguk_univ", name: "동대입구", x: 1062.3, y: 718.2, lines: ["3"] },
    "yaksu": { id: "yaksu", name: "약수", x: 1129.6, y: 792.8, lines: ["3", "6"] },
    "geumho": { id: "geumho", name: "금호", x: 1129.6, y: 881.7, lines: ["3"] },
    "oksu": { id: "oksu", name: "옥수", x: 1129.6, y: 958.1, lines: ["3"] },
    "apgujeong": { id: "apgujeong", name: "압구정", x: 1129.6, y: 1071.8, lines: ["3"] },
    "sinsa": { id: "sinsa", name: "신사", x: 1129.6, y: 1112.7, lines: ["3"] },
    "jamwon": { id: "jamwon", name: "잠원", x: 1129.6, y: 1175.9, lines: ["3"] },
    "express_bus": { id: "express_bus", name: "고속터미널", x: 1116.4, y: 1257.9, lines: ["3", "7"] },
    "nambu_terminal": { id: "nambu_terminal", name: "남부터미널", x: 1159.5, y: 1582.3, lines: ["3"] },
    "yangjae": { id: "yangjae", name: "양재", x: 1208.5, y: 1576.9, lines: ["3"] },
    "maebong": { id: "maebong", name: "매봉", x: 1260.7, y: 1582.3, lines: ["3"] },
    "dogok": { id: "dogok", name: "도곡", x: 1306.7, y: 1576.9, lines: ["3"] },
    "daechi": { id: "daechi", name: "대치", x: 1361, y: 1582.3, lines: ["3"] },
    "hangnyeoul": { id: "hangnyeoul", name: "학여울", x: 1408.4, y: 1582.3, lines: ["3"] },
    "daecheong": { id: "daecheong", name: "대청", x: 1456.4, y: 1582.3, lines: ["3"] },
    "irwon": { id: "irwon", name: "일원", x: 1503.1, y: 1582.3, lines: ["3"] },
    "suseo": { id: "suseo", name: "수서", x: 1550, y: 1582.3, lines: ["3"] },
    "garak_market": { id: "garak_market", name: "가락시장", x: 1633.2, y: 1482.7, lines: ["3", "8"] },
    "ogeum": { id: "ogeum", name: "오금", x: 1717.2, y: 1392.5, lines: ["3", "5"] },
    "nowon": { id: "nowon", name: "노원", x: 1623.1, y: 75.8, lines: ["4", "7"] },
    "ssangmun": { id: "ssangmun", name: "쌍문", x: 1401.3, y: 80.6, lines: ["4"] },
    "suyu": { id: "suyu", name: "수유", x: 1346.5, y: 116, lines: ["4"] },
    "mia": { id: "mia", name: "미아", x: 1306.4, y: 156.2, lines: ["4"] },
    "miasageori": { id: "miasageori", name: "미아사거리", x: 1266.2, y: 196.4, lines: ["4"] },
    "gireum": { id: "gireum", name: "길음", x: 1226, y: 236.6, lines: ["4"] },
    "sungshin": { id: "sungshin", name: "성신여대입구", x: 1163.9, y: 298.1, lines: ["4"] },
    "hansung": { id: "hansung", name: "한성대입구", x: 1127, y: 335.6, lines: ["4"] },
    "hyehwa": { id: "hyehwa", name: "혜화", x: 1096.4, y: 366.2, lines: ["4"] },
    "myeongdong": { id: "myeongdong", name: "명동", x: 943.9, y: 667.6, lines: ["4"] },
    "hoehyeon": { id: "hoehyeon", name: "회현", x: 943.9, y: 711.1, lines: ["4"] },
    "sookmyung": { id: "sookmyung", name: "숙대입구", x: 943.9, y: 844.9, lines: ["4"] },
    "samgakji": { id: "samgakji", name: "삼각지", x: 943.9, y: 940.4, lines: ["4", "6"] },
    "sinyongsan": { id: "sinyongsan", name: "신용산", x: 943.9, y: 973.6, lines: ["4"] },
    "ichon": { id: "ichon", name: "이촌", x: 943.9, y: 1004.8, lines: ["4"] },
    "dongjak": { id: "dongjak", name: "동작", x: 943.9, y: 1126.1, lines: ["4"] },
    "isu": { id: "isu", name: "총신대입구(이수)", x: 943.9, y: 1377.8, lines: ["4", "7"] },
    "namtaeryeong": { id: "namtaeryeong", name: "남태령", x: 943.9, y: 1599.4, lines: ["4"] },
    "gimpo_airport": { id: "gimpo_airport", name: "김포공항", x: 70.8, y: 605.6, lines: ["5"] },
    "songjeong": { id: "songjeong", name: "송정", x: 70.8, y: 725.3, lines: ["5"] },
    "magok": { id: "magok", name: "마곡", x: 89.8, y: 794.9, lines: ["5"] },
    "balsan": { id: "balsan", name: "발산", x: 130.9, y: 836.3, lines: ["5"] },
    "ujangsan": { id: "ujangsan", name: "우장산", x: 174.9, y: 880.1, lines: ["5"] },
    "hwagok": { id: "hwagok", name: "화곡", x: 225.3, y: 930.7, lines: ["5"] },
    "sinjeong": { id: "sinjeong", name: "신정", x: 305.1, y: 1010.2, lines: ["5"] },
    "mokdong": { id: "mokdong", name: "목동", x: 339.1, y: 1044.3, lines: ["5"] },
    "omokgyo": { id: "omokgyo", name: "오목교", x: 378.6, y: 1083.9, lines: ["5"] },
    "yangpyeong": { id: "yangpyeong", name: "양평", x: 414.7, y: 1120, lines: ["5"] },
    "yeongdeungpo_market": { id: "yeongdeungpo_market", name: "영등포시장", x: 554.9, y: 1181.9, lines: ["5"] },
    "yeouido": { id: "yeouido", name: "여의도", x: 683.4, y: 1126.1, lines: ["5"] },
    "yeouinaru": { id: "yeouinaru", name: "여의나루", x: 683.4, y: 1100.1, lines: ["5"] },
    "mapo": { id: "mapo", name: "마포", x: 683.4, y: 1025.6, lines: ["5"] },
    "gongdeok": { id: "gongdeok", name: "공덕", x: 683.4, y: 926.4, lines: ["5", "6"] },
    "aeogae": { id: "aeogae", name: "애오개", x: 683.4, y: 778.6, lines: ["5"] },
    "seodaemun": { id: "seodaemun", name: "서대문", x: 683.4, y: 507, lines: ["5"] },
    "gwanghwamun": { id: "gwanghwamun", name: "광화문", x: 683.4, y: 447.7, lines: ["5"] },
    "cheonggu": { id: "cheonggu", name: "청구", x: 1183.8, y: 641, lines: ["5", "6"] },
    "singeumho": { id: "singeumho", name: "신금호", x: 1232.8, y: 635.3, lines: ["5"] },
    "haengdang": { id: "haengdang", name: "행당", x: 1273.8, y: 635.3, lines: ["5"] },
    "majang": { id: "majang", name: "마장", x: 1472.4, y: 635.3, lines: ["5"] },
    "dapsimni": { id: "dapsimni", name: "답십리", x: 1534.1, y: 635.3, lines: ["5"] },
    "janghanpyeong": { id: "janghanpyeong", name: "장한평", x: 1583.8, y: 635.3, lines: ["5"] },
    "gunja": { id: "gunja", name: "군자", x: 1627.9, y: 635.3, lines: ["5", "7"] },
    "achasan": { id: "achasan", name: "아차산", x: 1693.9, y: 706.9, lines: ["5"] },
    "gwangnaru": { id: "gwangnaru", name: "광나루", x: 1693.9, y: 778.8, lines: ["5"] },
    "cheonho": { id: "cheonho", name: "천호", x: 1690.1, y: 919.4, lines: ["5", "8"] },
    "gangdong": { id: "gangdong", name: "강동", x: 1693.9, y: 1029, lines: ["5"] },
    "gildong": { id: "gildong", name: "길동", x: 1737.4, y: 985.5, lines: ["5"] },
    "gubeundari": { id: "gubeundari", name: "굽은다리", x: 1770.2, y: 952.7, lines: ["5"] },
    "myeongil": { id: "myeongil", name: "명일", x: 1803, y: 919.9, lines: ["5"] },
    "godeok": { id: "godeok", name: "고덕", x: 1835.9, y: 887, lines: ["5"] },
    "sangil_dong": { id: "sangil_dong", name: "상일동", x: 1868.7, y: 854.2, lines: ["5"] },
    "dunchon_dong": { id: "dunchon_dong", name: "둔촌동", x: 1693.9, y: 1149.9, lines: ["5"] },
    "olympic_park": { id: "olympic_park", name: "올림픽공원", x: 1693.9, y: 1252.7, lines: ["5"] },
    "bangi": { id: "bangi", name: "방이", x: 1693.9, y: 1325.7, lines: ["5"] },
    "gaerong": { id: "gaerong", name: "개롱", x: 1757.9, y: 1392.5, lines: ["5"] },
    "geoyeo": { id: "geoyeo", name: "거여", x: 1799.7, y: 1392.5, lines: ["5"] },
    "macheon": { id: "macheon", name: "마천", x: 1839.1, y: 1392.5, lines: ["5"] },
    "eungam": { id: "eungam", name: "응암", x: 634.1, y: 238.7, lines: ["6"] },
    "yeokchon": { id: "yeokchon", name: "역촌", x: 661.5, y: 211.5, lines: ["6"] },
    "dokbawi": { id: "dokbawi", name: "독바위", x: 637.1, y: 143.4, lines: ["6"] },
    "gusan": { id: "gusan", name: "구산", x: 612.8, y: 211.3, lines: ["6"] },
    "saejeol": { id: "saejeol", name: "새절", x: 497.8, y: 375.3, lines: ["6"] },
    "jeungsan": { id: "jeungsan", name: "증산", x: 427.4, y: 445.4, lines: ["6"] },
    "dmc": { id: "dmc", name: "디지털미디어시티", x: 351.5, y: 634.4, lines: ["6"] },
    "worldcup_stadium": { id: "worldcup_stadium", name: "월드컵경기장", x: 351.5, y: 714.7, lines: ["6"] },
    "mapo_gu_office": { id: "mapo_gu_office", name: "마포구청", x: 367.1, y: 780.5, lines: ["6"] },
    "mangwon": { id: "mangwon", name: "망원", x: 406.4, y: 819.8, lines: ["6"] },
    "sangsu": { id: "sangsu", name: "상수", x: 505.2, y: 918.8, lines: ["6"] },
    "gwangheungchang": { id: "gwangheungchang", name: "광흥창", x: 570.6, y: 946.1, lines: ["6"] },
    "daeheung": { id: "daeheung", name: "대흥", x: 628.5, y: 946.1, lines: ["6"] },
    "hyochang_park": { id: "hyochang_park", name: "효창공원앞", x: 782.7, y: 946.1, lines: ["6"] },
    "noksapyeong": { id: "noksapyeong", name: "녹사평", x: 988.4, y: 929.2, lines: ["6"] },
    "itaewon": { id: "itaewon", name: "이태원", x: 1014.3, y: 903.1, lines: ["6"] },
    "hangangjin": { id: "hangangjin", name: "한강진", x: 1042.4, y: 875.2, lines: ["6"] },
    "beotigogae": { id: "beotigogae", name: "버티고개", x: 1070.5, y: 847.1, lines: ["6"] },
    "changsin": { id: "changsin", name: "창신", x: 1199, y: 376.6, lines: ["6"] },
    "bomun": { id: "bomun", name: "보문", x: 1219.3, y: 347.8, lines: ["6"] },
    "anam": { id: "anam", name: "안암", x: 1247.1, y: 328.5, lines: ["6"] },
    "korea_univ": { id: "korea_univ", name: "고려대", x: 1270.2, y: 305.4, lines: ["6"] },
    "wolgok": { id: "wolgok", name: "월곡", x: 1292, y: 283.6, lines: ["6"] },
    "sangwolgok": { id: "sangwolgok", name: "상월곡", x: 1362.1, y: 248.5, lines: ["6"] },
    "dolgoji": { id: "dolgoji", name: "돌곶이", x: 1419.3, y: 248.5, lines: ["6"] },
    "taereung": { id: "taereung", name: "태릉입구", x: 1623.1, y: 242.3, lines: ["6", "7"] },
    "hwarangdae": { id: "hwarangdae", name: "화랑대", x: 1711.6, y: 251.2, lines: ["6"] },
    "bonghwasan": { id: "bonghwasan", name: "봉화산", x: 1744.7, y: 283.7, lines: ["6"] },
    "junggye": { id: "junggye", name: "중계", x: 1623.1, y: 117.5, lines: ["7"] },
    "hagye": { id: "hagye", name: "하계", x: 1623.1, y: 153.9, lines: ["7"] },
    "gongneung": { id: "gongneung", name: "공릉", x: 1623.1, y: 191.8, lines: ["7"] },
    "meokgol": { id: "meokgol", name: "먹골", x: 1623.1, y: 290, lines: ["7"] },
    "junghwa": { id: "junghwa", name: "중화", x: 1623.1, y: 318.8, lines: ["7"] },
    "sangbong": { id: "sangbong", name: "상봉", x: 1623.1, y: 376.8, lines: ["7"] },
    "myeonmok": { id: "myeonmok", name: "면목", x: 1623.1, y: 466.7, lines: ["7"] },
    "sagajeong": { id: "sagajeong", name: "사가정", x: 1623.1, y: 507.8, lines: ["7"] },
    "yongmasan": { id: "yongmasan", name: "용마산", x: 1623.1, y: 548.8, lines: ["7"] },
    "junggok": { id: "junggok", name: "중곡", x: 1623.1, y: 589.8, lines: ["7"] },
    "children_park": { id: "children_park", name: "어린이대공원", x: 1583.6, y: 806.3, lines: ["7"] },
    "ttukseom_park": { id: "ttukseom_park", name: "뚝섬유원지", x: 1447.6, y: 942.2, lines: ["7"] },
    "cheongdam": { id: "cheongdam", name: "청담", x: 1381.5, y: 1008.4, lines: ["7"] },
    "gangnam_gu_office": { id: "gangnam_gu_office", name: "강남구청", x: 1306.7, y: 1089.3, lines: ["7"] },
    "hak_dong": { id: "hak_dong", name: "학동", x: 1256.2, y: 1133.5, lines: ["7"] },
    "nonhyeon": { id: "nonhyeon", name: "논현", x: 1205, y: 1191.6, lines: ["7"] },
    "banpo": { id: "banpo", name: "반포", x: 1168.9, y: 1220.6, lines: ["7"] },
    "naebang": { id: "naebang", name: "내방", x: 1053.1, y: 1336.5, lines: ["7"] },
    "namseong": { id: "namseong", name: "남성", x: 908.8, y: 1372.3, lines: ["7"] },
    "soongsil": { id: "soongsil", name: "숭실대입구", x: 870.9, y: 1372.3, lines: ["7"] },
    "sangdo": { id: "sangdo", name: "상도", x: 833, y: 1372.3, lines: ["7"] },
    "jangseungbaegi": { id: "jangseungbaegi", name: "장승배기", x: 795.5, y: 1372.3, lines: ["7"] },
    "sindaebang_samgeori": { id: "sindaebang_samgeori", name: "신대방삼거리", x: 751.4, y: 1372.3, lines: ["7"] },
    "boramae": { id: "boramae", name: "보라매", x: 699.9, y: 1372.3, lines: ["7"] },
    "sinpung": { id: "sinpung", name: "신풍", x: 647, y: 1372.3, lines: ["7"] },
    "namguro": { id: "namguro", name: "남구로", x: 525.6, y: 1372.3, lines: ["7"] },
    "cheolsan": { id: "cheolsan", name: "철산", x: 416.1, y: 1372.3, lines: ["7"] },
    "gwangmyeong_sageori": { id: "gwangmyeong_sageori", name: "광명사거리", x: 378.1, y: 1365.5, lines: ["7"] },
    "cheonwang": { id: "cheonwang", name: "천왕", x: 351.2, y: 1338, lines: ["7"] },
    "amsa": { id: "amsa", name: "암사", x: 1729.1, y: 881, lines: ["8"] },
    "gangdong_gu_office": { id: "gangdong_gu_office", name: "강동구청", x: 1611.3, y: 998.6, lines: ["8"] },
    "mongchontoseong": { id: "mongchontoseong", name: "몽촌토성", x: 1547.7, y: 1062.2, lines: ["8"] },
    "seokchon": { id: "seokchon", name: "석촌", x: 1580.2, y: 1252.6, lines: ["8"] },
    "songpa": { id: "songpa", name: "송파", x: 1580.2, y: 1363.5, lines: ["8"] },
    "munjeong": { id: "munjeong", name: "문정", x: 1653.5, y: 1511.3, lines: ["8"] },
    "jangji": { id: "jangji", name: "장지", x: 1677.5, y: 1535.3, lines: ["8"] },
    "bokjeong": { id: "bokjeong", name: "복정", x: 1704.1, y: 1567.6, lines: ["8"] },
    "sanseong": { id: "sanseong", name: "산성", x: 1738.8, y: 1596.7, lines: ["8"] },
    "namhansanseong": { id: "namhansanseong", name: "남한산성입구", x: 1762.3, y: 1620, lines: ["8"] },
    "dandaeogeori": { id: "dandaeogeori", name: "단대오거리", x: 1787.7, y: 1645.7, lines: ["8"] },
    "sinheung": { id: "sinheung", name: "신흥", x: 1813.1, y: 1671.2, lines: ["8"] },
    "sujin": { id: "sujin", name: "수진", x: 1793.1, y: 1693.6, lines: ["8"] },
    "moran": { id: "moran", name: "모란", x: 1750.3, y: 1693.6, lines: ["8"] }
  };

  function E(id, location, type, floors, status, reason) {
    return { id: id, location: location, type: type, floors: floors, status: status || "AVAILABLE", reason: reason || "" };
  }

  var elevators = {
    "cityhall": [
      E("cityhall-e1", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("cityhall-e2", "12번 출구", "exit", "지상 ↔ B1 대합실", "MAINTENANCE", "정기 안전점검 (10:00~15:00)"),
      E("cityhall-e3", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("cityhall-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B3 승강장"),
      E("cityhall-e5", "1·2호선 환승통로", "transfer", "B2 ↔ B3")
    ],
    "euljiro1ga": [
      E("euljiro1ga-e1", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("euljiro1ga-e2", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("euljiro1ga-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "euljiro3ga": [
      E("euljiro3ga-e1", "-6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("euljiro3ga-e2", "-1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("euljiro3ga-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("euljiro3ga-e4", "3호선 환승통로", "transfer", "B2 ↔ B3 3호선 승강장")
    ],
    "euljiro4ga": [
      E("euljiro4ga-e1", "-6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("euljiro4ga-e2", "-4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("euljiro4ga-e3", "0번 출구", "exit", "지상 ↔ B1 대합실"),
      E("euljiro4ga-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("euljiro4ga-e5", "5호선 환승통로", "transfer", "B2 ↔ B3 5호선 승강장")
    ],
    "ddp": [
      E("ddp-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ddp-e2", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ddp-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ddp-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("ddp-e5", "4호선 환승통로", "transfer", "B2 ↔ B3 4호선 승강장")
    ],
    "sindang": [
      E("sindang-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sindang-e2", "3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sindang-e3", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sindang-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("sindang-e5", "6호선 환승통로", "transfer", "B2 ↔ B3 6호선 승강장")
    ],
    "sangwangsimni": [
      E("sangwangsimni-e1", "3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sangwangsimni-e2", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sangwangsimni-e3", "2호선 승강장 (내선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("sangwangsimni-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "wangsimni": [
      E("wangsimni-e1", "2번 출구", "exit", "지상 ↔ B1 대합실", "MAINTENANCE", "정기 점검 (09:00~12:00)"),
      E("wangsimni-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("wangsimni-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("wangsimni-e4", "5호선 환승통로", "transfer", "B2 ↔ B3 5호선 승강장")
    ],
    "hanyang_univ": [
      E("hanyang_univ-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("hanyang_univ-e2", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "ttukseom": [
      E("ttukseom-e1", "-8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ttukseom-e2", "-2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ttukseom-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "seongsu": [
      E("seongsu-e1", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seongsu-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seongsu-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "konkuk": [
      E("konkuk-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("konkuk-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("konkuk-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("konkuk-e4", "7호선 환승통로", "transfer", "B2 ↔ B3 7호선 승강장")
    ],
    "guui": [
      E("guui-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("guui-e2", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("guui-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "gangbyeon": [
      E("gangbyeon-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gangbyeon-e2", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gangbyeon-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "jamsilnaru": [
      E("jamsilnaru-e1", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jamsilnaru-e2", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jamsilnaru-e3", "2호선 승강장 (내선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("jamsilnaru-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "jamsil": [
      E("jamsil-e1", "2번 출구 (롯데월드몰)", "exit", "지상 ↔ B1 대합실"),
      E("jamsil-e2", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jamsil-e3", "2호선 승강장 (내선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("jamsil-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("jamsil-e5", "8호선 환승통로", "transfer", "B2 ↔ B3 8호선 승강장")
    ],
    "jamsilsaenae": [
      E("jamsilsaenae-e1", "3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jamsilsaenae-e2", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "sports_complex": [
      E("sports_complex-e1", "-5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sports_complex-e2", "-3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sports_complex-e3", "0번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sports_complex-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "samseong": [
      E("samseong-e1", "5번 출구 (코엑스)", "exit", "지상 ↔ B1 대합실"),
      E("samseong-e2", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("samseong-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "seolleung": [
      E("seolleung-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seolleung-e2", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seolleung-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "yeoksam": [
      E("yeoksam-e1", "3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yeoksam-e2", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yeoksam-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "gangnam": [
      E("gangnam-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gangnam-e2", "12번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gangnam-e3", "2호선 승강장 (내선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("gangnam-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "gyodae": [
      E("gyodae-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gyodae-e2", "14번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gyodae-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("gyodae-e4", "3호선 환승통로", "transfer", "B2 ↔ B3 3호선 승강장")
    ],
    "seocho": [
      E("seocho-e1", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seocho-e2", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "bangbae": [
      E("bangbae-e1", "-4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("bangbae-e2", "-3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("bangbae-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "sadang": [
      E("sadang-e1", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sadang-e2", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sadang-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장", "UNAVAILABLE", "출입문 센서 이상 — 긴급 수리 중"),
      E("sadang-e4", "4호선 환승통로", "transfer", "B2 ↔ B4 4호선 승강장")
    ],
    "nakseongdae": [
      E("nakseongdae-e1", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nakseongdae-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nakseongdae-e3", "2호선 승강장 (내선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("nakseongdae-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "seoul_univ": [
      E("seoul_univ-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seoul_univ-e2", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "bongcheon": [
      E("bongcheon-e1", "-7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("bongcheon-e2", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "sillim": [
      E("sillim-e1", "6번 출구", "exit", "지상 ↔ B1 대합실", "UNAVAILABLE", "침수 우려로 운행 중지 — 배수 작업 중"),
      E("sillim-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sillim-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "sindaebang": [
      E("sindaebang-e1", "-1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sindaebang-e2", "0번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sindaebang-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "guro_digital": [
      E("guro_digital-e1", "-2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("guro_digital-e2", "0번 출구", "exit", "지상 ↔ B1 대합실"),
      E("guro_digital-e3", "2호선 승강장 (내선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("guro_digital-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "daerim": [
      E("daerim-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("daerim-e2", "3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("daerim-e3", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("daerim-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("daerim-e5", "7호선 환승통로", "transfer", "B2 ↔ B3 7호선 승강장")
    ],
    "sindorim": [
      E("sindorim-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sindorim-e2", "3번 출구", "exit", "지상 ↔ 2F 대합실", "UNAVAILABLE", "구동 모터 고장 — 부품 교체 중 (복구 예정 18:00)"),
      E("sindorim-e3", "1호선 승강장", "platform", "1F ↔ 지상 승강장"),
      E("sindorim-e4", "2호선 본선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("sindorim-e5", "1·2호선 환승통로", "transfer", "지상 ↔ B1")
    ],
    "mullae": [
      E("mullae-e1", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("mullae-e2", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("mullae-e3", "2호선 승강장 (내선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("mullae-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "yeongdeungpo_gu": [
      E("yeongdeungpo_gu-e1", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yeongdeungpo_gu-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yeongdeungpo_gu-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("yeongdeungpo_gu-e4", "5호선 환승통로", "transfer", "B2 ↔ B3 5호선 승강장")
    ],
    "dangsan": [
      E("dangsan-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dangsan-e2", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dangsan-e3", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dangsan-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "hapjeong": [
      E("hapjeong-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("hapjeong-e2", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("hapjeong-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("hapjeong-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("hapjeong-e5", "6호선 환승통로", "transfer", "B2 ↔ B3 6호선 승강장")
    ],
    "hongik": [
      E("hongik-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("hongik-e2", "9번 출구", "exit", "지상 ↔ B1 대합실", "MAINTENANCE", "정기 점검 (13:00~17:00)"),
      E("hongik-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "sinchon": [
      E("sinchon-e1", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinchon-e2", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinchon-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "ewha": [
      E("ewha-e1", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ewha-e2", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "ahyeon": [
      E("ahyeon-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ahyeon-e2", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("ahyeon-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "chungjeongno": [
      E("chungjeongno-e1", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("chungjeongno-e2", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("chungjeongno-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("chungjeongno-e4", "5호선 환승통로", "transfer", "B2 ↔ B4 5호선 승강장")
    ],
    "seoul": [
      E("seoul-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seoul-e2", "11번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seoul-e3", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("seoul-e4", "4호선 환승통로", "transfer", "B2 ↔ B3 4호선 승강장", "MAINTENANCE", "노후 설비 교체 공사 (~11/15)")
    ],
    "express_bus": [
      E("express_bus-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("express_bus-e2", "8-1번 출구 (경부선 터미널)", "exit", "지상 ↔ B1 대합실"),
      E("express_bus-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B3 승강장"),
      E("express_bus-e4", "7호선 환승통로", "transfer", "B3 ↔ B5 7호선 승강장", "UNAVAILABLE", "와이어로프 점검 중 이상 발견 — 운행 중지")
    ],
    "jongno3ga": [
      E("jongno3ga-e1", "-7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jongno3ga-e2", "-6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jongno3ga-e3", "0번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jongno3ga-e4", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("jongno3ga-e5", "3호선 환승통로", "transfer", "B2 ↔ B3 3호선 승강장")
    ],
    "gongdeok": [
      E("gongdeok-e1", "-8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gongdeok-e2", "-1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gongdeok-e3", "0번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gongdeok-e4", "5호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("gongdeok-e5", "6호선 환승통로", "transfer", "B2 ↔ B3 6호선 승강장")
    ],
    "yeouido": [
      E("yeouido-e1", "-6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yeouido-e2", "-2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yeouido-e3", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yeouido-e4", "5호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "gimpo_airport": [
      E("gimpo_airport-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gimpo_airport-e2", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gimpo_airport-e3", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gimpo_airport-e4", "5호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "yangjae": [
      E("yangjae-e1", "-3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yangjae-e2", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yangjae-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "suseo": [
      E("suseo-e1", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("suseo-e2", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("suseo-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "dongdaemun": [
      E("dongdaemun-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongdaemun-e2", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongdaemun-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongdaemun-e4", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("dongdaemun-e5", "4호선 환승통로", "transfer", "B2 ↔ B3 4호선 승강장")
    ],
    "isu": [
      E("isu-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("isu-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("isu-e3", "4호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("isu-e4", "7호선 환승통로", "transfer", "B2 ↔ B3 7호선 승강장")
    ],
    "yongsan": [
      E("yongsan-e1", "-2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yongsan-e2", "-1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yongsan-e3", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "noryangjin": [
      E("noryangjin-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("noryangjin-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("noryangjin-e3", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "sinsa": [
      E("sinsa-e1", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinsa-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinsa-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinsa-e4", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "nonhyeon": [
      E("nonhyeon-e1", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nonhyeon-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nonhyeon-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nonhyeon-e4", "7호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "chungmuro": [
      E("chungmuro-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("chungmuro-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("chungmuro-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("chungmuro-e4", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("chungmuro-e5", "4호선 환승통로", "transfer", "B2 ↔ B3 4호선 승강장")
    ],
    "yaksu": [
      E("yaksu-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yaksu-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yaksu-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("yaksu-e4", "6호선 환승통로", "transfer", "B2 ↔ B3 6호선 승강장")
    ],
    "oksu": [
      E("oksu-e1", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("oksu-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("oksu-e3", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("oksu-e4", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "dongjak": [
      E("dongjak-e1", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongjak-e2", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongjak-e3", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongjak-e4", "4호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "garak_market": [
      E("garak_market-e1", "-3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("garak_market-e2", "-1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("garak_market-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("garak_market-e4", "8호선 환승통로", "transfer", "B2 ↔ B3 8호선 승강장")
    ],
    "cheonho": [
      E("cheonho-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("cheonho-e2", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("cheonho-e3", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("cheonho-e4", "5호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("cheonho-e5", "8호선 환승통로", "transfer", "B2 ↔ B3 8호선 승강장")
    ],
    "gunja": [
      E("gunja-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gunja-e2", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gunja-e3", "5호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("gunja-e4", "7호선 환승통로", "transfer", "B2 ↔ B3 7호선 승강장")
    ],
    "mongchontoseong": [
      E("mongchontoseong-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("mongchontoseong-e2", "3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("mongchontoseong-e3", "8호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "seokchon": [
      E("seokchon-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seokchon-e2", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seokchon-e3", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seokchon-e4", "8호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "dmc": [
      E("dmc-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dmc-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dmc-e3", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dmc-e4", "6호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "onsu": [
      E("onsu-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("onsu-e2", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("onsu-e3", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("onsu-e4", "7호선 환승통로", "transfer", "B2 ↔ B3 7호선 승강장")
    ]
  };

  var alternativeTips = {
    "gangnam>yeoksam": "역삼역 3번 출구(엘리베이터)로 나와 테헤란로를 따라 강남역 방향으로 도보 약 10분 (800m). 146·341번 버스로 1정거장.",
    "gangnam>gyodae": "교대역 14번 출구(엘리베이터) 이용 후 서초대로를 따라 강남역 방향 도보 약 12분 (900m). 저상버스 470·741번으로 1정거장.",
    "gangnam>yangjae": "양재역(3호선)에서 하차 후 1번 출구 엘리베이터 이용. 강남대로를 따라 도보 약 15분 (1.2km), 또는 140·441번 버스 2정거장.",
    "yeoksam>gangnam": "강남역 1번 출구(엘리베이터)로 나와 테헤란로를 따라 역삼역 방향 도보 약 10분 (800m). 146·341번 버스 1정거장.",
    "gyodae>seocho": "서초역 엘리베이터 출구로 나와 서초대로를 따라 교대역 방향 도보 약 6분 (450m). 평지 위주라 휠체어 이동이 수월합니다.",
    "cityhall>euljiro1ga": "을지로입구역 5번 출구(엘리베이터)로 나와 을지로를 따라 시청 방향 도보 약 7분 (550m). 서울광장까지 평지 구간입니다.",
    "cityhall>chungjeongno": "충정로역 4번 출구(엘리베이터)로 나와 서소문로를 따라 시청 방향 도보 약 15분 (1.1km). 172·472번 버스로 2정거장.",
    "cityhall>seoul": "서울역 1번 출구 엘리베이터 이용 후 세종대로를 따라 북쪽으로 도보 약 13분 (1km). 402·N16번 저상버스 2정거장.",
    "jamsil>jamsilsaenae": "잠실새내역 엘리베이터 출구로 나와 올림픽로를 따라 잠실 방향 도보 약 15분 (1.1km). 341·360번 버스로 2정거장.",
    "jamsil>jamsilnaru": "잠실나루역 엘리베이터 출구로 나와 잠실 방향 도보 약 12분 (900m). 잠실대교 남단 방향 평지, 30-3번 마을버스 이용 가능.",
    "sindorim>daerim": "대림역 엘리베이터 출구로 나와 신도림 방향 도보 약 20분 (1.5km). 저상버스 6511·6515번으로 3정거장 이동을 권장합니다.",
    "sindorim>mullae": "문래역 엘리베이터 출구로 나와 경인로 방향 도보 약 12분 (900m). 600·5714번 버스 1정거장.",
    "hongik>hapjeong": "합정역 엘리베이터 출구로 나와 양화로를 따라 홍대입구 방향 도보 약 10분 (750m). 271·602번 버스 1정거장.",
    "hongik>sinchon": "신촌역 엘리베이터 출구로 나와 신촌로를 따라 홍대입구 방향 도보 약 13분 (1km). 7711·7016번 버스 2정거장.",
    "samseong>seolleung": "선릉역 10번 출구(엘리베이터)로 나와 테헤란로를 따라 삼성역 방향 도보 약 13분 (1km). 143·146번 버스 1정거장.",
    "samseong>sports_complex": "종합운동장역 엘리베이터 출구로 나와 봉은사로를 따라 코엑스 방향 도보 약 12분 (900m). 2415번 버스 1정거장.",
    "wangsimni>sangwangsimni": "상왕십리역 엘리베이터 출구로 나와 왕십리로를 따라 왕십리 방향 도보 약 8분 (600m). 2016·2222번 버스 1정거장.",
    "wangsimni>hanyang_univ": "한양대역 엘리베이터 출구로 나와 왕십리로를 따라 도보 약 8분 (600m). 경사로가 있어 저상버스 2012번 1정거장 이용을 권장합니다."
  };

  window.MOCK = {
    viewBox: { width: 1939, height: 1764 },
    // 한강 (원본 노선도의 한강 윤곽, 지도 좌표)
    river: {
      d: "M1084.3 1091.2C1092.7 1091.2 1100.7 1087.9 1106.7 1081.9L1216.2 972.4C1218.8 969.7 1222.4 968.2 1226.2 968.2L1381.3 968.2C1385.1 968.2 1388.7 969.7 1391.3 972.4L1453.8 1034.8C1459.8 1040.8 1467.7 1044.1 1476.2 1044.1L1525.4 1044.1C1533.8 1044.1 1541.8 1040.8 1547.8 1034.8L1834.9 747.7C1837.5 745.1 1841.1 743.6 1844.9 743.6L2297 743.6L2297 708.6L1837.6 708.6C1829.2 708.6 1821.2 711.9 1815.2 717.9L1528.1 1005C1525.5 1007.6 1521.9 1009.1 1518.1 1009.1L1483.4 1009.1C1479.7 1009.1 1476.1 1007.6 1473.4 1005L1410.9 942.5C1405 936.5 1397 933.2 1388.5 933.2L1219 933.2C1210.6 933.2 1202.5 936.6 1196.6 942.5L1087.1 1052C1084.4 1054.7 1080.8 1056.2 1077 1056.2L619 1056.2C615.2 1056.2 611.6 1054.7 609 1052.1L330.6 773.7C328 771 326.5 767.4 326.5 763.7L326.5 630.1C326.5 621.7 323.2 613.7 317.2 607.7L-332 -41.4L-344.4 -29.1L-356.7 -16.7L287.3 627.3C290 630 291.5 633.6 291.5 637.4L291.5 770.9C291.5 779.4 294.7 787.3 300.7 793.3L589.4 1081.9C595.3 1087.9 603.3 1091.2 611.8 1091.2L1084.3 1091.2Z",
      label: { x: 895, y: 1082 }
    },
    lines: lines,
    stations: stations,
    elevators: elevators,
    headways: { "1": 6, "2": 3, "3": 5, "4": 5, "5": 5, "6": 7, "7": 5, "8": 6 },
    firstTrain: "05:30",
    lastTrain: "24:00",
    timing: {
      minutesPerStop: 2,
      transferMinutes: 5,
      walkToStation: 7,
      stationEntry: 3,
      exitWalk: 3,
      walkPerStopMinutes: 12
    },
    alternativeTips: alternativeTips,
    demoScenarios: [
      { id: "gangnam", label: "강남역 엘리베이터 전체 고장", stationId: "gangnam" },
      { id: "cityhall", label: "시청역 엘리베이터 전체 고장", stationId: "cityhall" },
      { id: "jamsil", label: "잠실역 엘리베이터 전체 고장", stationId: "jamsil" },
      { id: "hongik", label: "홍대입구역 엘리베이터 전체 고장", stationId: "hongik" },
      { id: "sindorim", label: "신도림역 엘리베이터 전체 고장", stationId: "sindorim" }
    ]
  };
})();
