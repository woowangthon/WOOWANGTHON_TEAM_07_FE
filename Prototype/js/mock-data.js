/* 엘리베이터 지하철 — 목업 데이터 (CARD-003 §1)
 * 좌표: viewBox 1600×1400, 실제 위경도를 노선도 중심 확대(fisheye) 투영 후 간격 보정.
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
      ]
    },
    "2": {
      id: "2", name: "2호선", short: "2", color: "#00A84D",
      loop: true,
      segments: [
        ["cityhall", "euljiro1ga", "euljiro3ga", "euljiro4ga", "ddp", "sindang", "sangwangsimni", "wangsimni", "hanyang_univ", "ttukseom", "seongsu", "konkuk", "guui", "gangbyeon", "jamsilnaru", "jamsil", "jamsilsaenae", "sports_complex", "samseong", "seolleung", "yeoksam", "gangnam", "gyodae", "seocho", "bangbae", "sadang", "nakseongdae", "seoul_univ", "bongcheon", "sillim", "sindaebang", "guro_digital", "daerim", "sindorim", "mullae", "yeongdeungpo_gu", "dangsan", "hapjeong", "hongik", "sinchon", "ewha", "ahyeon", "chungjeongno"],
        ["seongsu", "yongdap", "sindap", "yongdu", "sinseoldong"],
        ["sindorim", "dorimcheon", "yangcheon_gu", "sinjeongnegeori", "kkachisan"]
      ]
    },
    "3": {
      id: "3", name: "3호선", short: "3", color: "#EF7C1C",
      loop: false,
      segments: [
        ["gupabal", "yeonsinnae", "bulgwang", "nokbeon", "hongje", "muakjae", "dongnimmun", "gyeongbokgung", "anguk", "jongno3ga", "euljiro3ga", "chungmuro", "dongguk_univ", "yaksu", "geumho", "oksu", "apgujeong", "sinsa", "jamwon", "express_bus", "gyodae", "nambu_terminal", "yangjae", "maebong", "dogok", "daechi", "hangnyeoul", "daecheong", "irwon", "suseo", "garak_market", "ogeum"]
      ]
    },
    "4": {
      id: "4", name: "4호선", short: "4", color: "#00A5DE",
      loop: false,
      segments: [
        ["nowon", "changdong", "ssangmun", "suyu", "mia", "miasageori", "gireum", "sungshin", "hansung", "hyehwa", "dongdaemun", "ddp", "chungmuro", "myeongdong", "hoehyeon", "seoul", "sookmyung", "samgakji", "sinyongsan", "ichon", "dongjak", "isu", "sadang", "namtaeryeong"]
      ]
    },
    "5": {
      id: "5", name: "5호선", short: "5", color: "#996CAC",
      loop: false,
      segments: [
        ["gimpo_airport", "songjeong", "magok", "balsan", "ujangsan", "hwagok", "kkachisan", "sinjeong", "mokdong", "omokgyo", "yangpyeong", "yeongdeungpo_gu", "yeongdeungpo_market", "singil", "yeouido", "yeouinaru", "mapo", "gongdeok", "aeogae", "chungjeongno", "seodaemun", "gwanghwamun", "jongno3ga", "euljiro4ga", "ddp", "cheonggu", "singeumho", "haengdang", "wangsimni", "majang", "dapsimni", "janghanpyeong", "gunja", "achasan", "gwangnaru", "cheonho", "gangdong", "gildong", "gubeundari", "myeongil", "godeok", "sangil_dong"],
        ["gangdong", "dunchon_dong", "olympic_park", "bangi", "ogeum", "gaerong", "geoyeo", "macheon"]
      ]
    },
    "6": {
      id: "6", name: "6호선", short: "6", color: "#CD7C2F",
      loop: false,
      segments: [
        ["gusan", "eungam", "saejeol", "jeungsan", "dmc", "worldcup_stadium", "mapo_gu_office", "mangwon", "hapjeong", "sangsu", "gwangheungchang", "daeheung", "gongdeok", "hyochang_park", "samgakji", "noksapyeong", "itaewon", "hangangjin", "beotigogae", "yaksu", "cheonggu", "sindang", "dongmyo", "changsin", "bomun", "anam", "korea_univ", "wolgok", "sangwolgok", "dolgoji", "seokgye", "taereung", "hwarangdae", "bonghwasan"],
        ["eungam", "yeokchon", "bulgwang", "dokbawi", "yeonsinnae", "gusan"]
      ]
    },
    "7": {
      id: "7", name: "7호선", short: "7", color: "#747F00",
      loop: false,
      segments: [
        ["nowon", "junggye", "hagye", "gongneung", "taereung", "meokgol", "junghwa", "sangbong", "myeonmok", "sagajeong", "yongmasan", "junggok", "gunja", "children_park", "konkuk", "ttukseom_park", "cheongdam", "gangnam_gu_office", "hak_dong", "nonhyeon", "banpo", "express_bus", "naebang", "isu", "namseong", "soongsil", "sangdo", "jangseungbaegi", "sindaebang_samgeori", "boramae", "sinpung", "daerim", "namguro", "gasan_digital", "cheolsan", "gwangmyeong_sageori", "cheonwang", "onsu"]
      ]
    },
    "8": {
      id: "8", name: "8호선", short: "8", color: "#E6186C",
      loop: false,
      segments: [
        ["amsa", "cheonho", "gangdong_gu_office", "mongchontoseong", "jamsil", "seokchon", "songpa", "garak_market", "munjeong", "jangji", "bokjeong", "sanseong", "namhansanseong", "dandaeogeori", "sinheung", "sujin", "moran"]
      ]
    },
    "9": {
      id: "9", name: "9호선", short: "9", color: "#BDB092",
      loop: false,
      segments: [
        ["gimpo_airport", "sinbanghwa", "magongnaru", "yangcheon_hyanggyo", "gayang", "jeungmi", "deungchon", "yeomchang", "sinmokdong", "seonyudo", "dangsan", "national_assembly", "yeouido", "saetgang", "noryangjin", "nodeul", "heukseok", "dongjak", "gubanpo", "sinbanpo", "express_bus", "sapyeong", "sinnonhyeon", "eonju", "seonjeongneung", "samseong_jungang", "bongeunsa", "sports_complex", "samjeon", "seokchon_gobun", "seokchon", "songpanaru", "hanseong_baekje", "olympic_park", "dunchon_oryun", "vhs_medical"]
      ]
    },
    "SB": {
      id: "SB", name: "신분당선", short: "신분당", color: "#D4003B",
      loop: false,
      segments: [
        ["sinsa", "nonhyeon", "sinnonhyeon", "gangnam", "yangjae", "yangjae_forest", "cheonggyesan", "pangyo", "jeongja"]
      ]
    },
    "SU": {
      id: "SU", name: "수인분당선", short: "수인분당", color: "#FABE00",
      loop: false,
      segments: [
        ["cheongnyangni", "wangsimni", "seoul_forest", "apgujeong_rodeo", "gangnam_gu_office", "seonjeongneung", "seolleung", "hanti", "dogok", "guryong", "gaepo_dong", "daemosan", "suseo", "bokjeong", "gachon_univ", "taepyeong", "moran", "yatap", "imae", "seohyeon", "sunae", "jeongja"]
      ]
    },
    "AREX": {
      id: "AREX", name: "공항철도", short: "공항", color: "#0090D2",
      loop: false,
      segments: [
        ["seoul", "gongdeok", "hongik", "dmc", "magongnaru", "gimpo_airport"]
      ]
    },
    "GJ": {
      id: "GJ", name: "경의중앙선", short: "경의중앙", color: "#77C4A3",
      loop: false,
      segments: [
        ["susaek", "dmc", "gajwa", "hongik", "seogang_univ", "gongdeok", "hyochang_park", "yongsan", "ichon", "seobinggo", "hannam", "oksu", "eungbong", "wangsimni", "cheongnyangni", "hoegi", "jungnang", "sangbong", "mangu"],
        ["gajwa", "sinchon_gj", "seoul"]
      ]
    }
  };

  var stations = {
    "cityhall": { id: "cityhall", name: "시청", x: 686, y: 396, lines: ["1", "2"] },
    "euljiro1ga": { id: "euljiro1ga", name: "을지로입구", x: 725, y: 392, lines: ["2"] },
    "euljiro3ga": { id: "euljiro3ga", name: "을지로3가", x: 792, y: 385, lines: ["2", "3"] },
    "euljiro4ga": { id: "euljiro4ga", name: "을지로4가", x: 836, y: 382, lines: ["2", "5"] },
    "ddp": { id: "ddp", name: "동대문역사문화공원", x: 909, y: 396, lines: ["2", "4", "5"] },
    "sindang": { id: "sindang", name: "신당", x: 975, y: 399, lines: ["2", "6"] },
    "sangwangsimni": { id: "sangwangsimni", name: "상왕십리", x: 1049, y: 420, lines: ["2"] },
    "wangsimni": { id: "wangsimni", name: "왕십리", x: 1097, y: 452, lines: ["2", "5", "SU", "GJ"] },
    "hanyang_univ": { id: "hanyang_univ", name: "한양대", x: 1137, y: 502, lines: ["2"] },
    "ttukseom": { id: "ttukseom", name: "뚝섬", x: 1163, y: 568, lines: ["2"] },
    "seongsu": { id: "seongsu", name: "성수", x: 1203, y: 596, lines: ["2"] },
    "konkuk": { id: "konkuk", name: "건대입구", x: 1256, y: 632, lines: ["2", "7"] },
    "guui": { id: "guui", name: "구의", x: 1310, y: 657, lines: ["2"] },
    "gangbyeon": { id: "gangbyeon", name: "강변", x: 1339, y: 671, lines: ["2"] },
    "jamsilnaru": { id: "jamsilnaru", name: "잠실나루", x: 1349, y: 752, lines: ["2"] },
    "jamsil": { id: "jamsil", name: "잠실", x: 1343, y: 809, lines: ["2", "8"] },
    "jamsilsaenae": { id: "jamsilsaenae", name: "잠실새내", x: 1302, y: 829, lines: ["2"] },
    "sports_complex": { id: "sports_complex", name: "종합운동장", x: 1259, y: 843, lines: ["2", "9"] },
    "samseong": { id: "samseong", name: "삼성", x: 1217, y: 867, lines: ["2"] },
    "seolleung": { id: "seolleung", name: "선릉", x: 1151, y: 911, lines: ["2", "SU"] },
    "yeoksam": { id: "yeoksam", name: "역삼", x: 1082, y: 951, lines: ["2"] },
    "gangnam": { id: "gangnam", name: "강남", x: 1029, y: 978, lines: ["2", "SB"] },
    "gyodae": { id: "gyodae", name: "교대", x: 941, y: 1018, lines: ["2", "3"] },
    "seocho": { id: "seocho", name: "서초", x: 898, y: 1031, lines: ["2"] },
    "bangbae": { id: "bangbae", name: "방배", x: 831, y: 1088, lines: ["2"] },
    "sadang": { id: "sadang", name: "사당", x: 736, y: 1108, lines: ["2", "4"] },
    "nakseongdae": { id: "nakseongdae", name: "낙성대", x: 634, y: 1095, lines: ["2"] },
    "seoul_univ": { id: "seoul_univ", name: "서울대입구", x: 571, y: 1063, lines: ["2"] },
    "bongcheon": { id: "bongcheon", name: "봉천", x: 516, y: 1045, lines: ["2"] },
    "sillim": { id: "sillim", name: "신림", x: 459, y: 1021, lines: ["2"] },
    "sindaebang": { id: "sindaebang", name: "신대방", x: 390, y: 983, lines: ["2"] },
    "guro_digital": { id: "guro_digital", name: "구로디지털단지", x: 353, y: 982, lines: ["2"] },
    "daerim": { id: "daerim", name: "대림", x: 326, y: 930, lines: ["2", "7"] },
    "sindorim": { id: "sindorim", name: "신도림", x: 294, y: 838, lines: ["1", "2"] },
    "mullae": { id: "mullae", name: "문래", x: 297, y: 783, lines: ["2"] },
    "yeongdeungpo_gu": { id: "yeongdeungpo_gu", name: "영등포구청", x: 301, y: 738, lines: ["2", "5"] },
    "dangsan": { id: "dangsan", name: "당산", x: 314, y: 677, lines: ["2", "9"] },
    "hapjeong": { id: "hapjeong", name: "합정", x: 355, y: 568, lines: ["2", "6"] },
    "hongik": { id: "hongik", name: "홍대입구", x: 399, y: 508, lines: ["2", "AREX", "GJ"] },
    "sinchon": { id: "sinchon", name: "신촌", x: 449, y: 510, lines: ["2"] },
    "ewha": { id: "ewha", name: "이대", x: 495, y: 496, lines: ["2"] },
    "ahyeon": { id: "ahyeon", name: "아현", x: 546, y: 476, lines: ["2"] },
    "chungjeongno": { id: "chungjeongno", name: "충정로", x: 593, y: 450, lines: ["2", "5"] },
    "yongdap": { id: "yongdap", name: "용답", x: 1164, y: 461, lines: ["2"] },
    "sindap": { id: "sindap", name: "신답", x: 1134, y: 398, lines: ["2"] },
    "yongdu": { id: "yongdu", name: "용두", x: 1085, y: 366, lines: ["2"] },
    "sinseoldong": { id: "sinseoldong", name: "신설동", x: 1008, y: 339, lines: ["1", "2"] },
    "dorimcheon": { id: "dorimcheon", name: "도림천", x: 267, y: 799, lines: ["2"] },
    "yangcheon_gu": { id: "yangcheon_gu", name: "양천구청", x: 228, y: 801, lines: ["2"] },
    "sinjeongnegeori": { id: "sinjeongnegeori", name: "신정네거리", x: 198, y: 758, lines: ["2"] },
    "kkachisan": { id: "kkachisan", name: "까치산", x: 183, y: 690, lines: ["2", "5"] },
    "changdong": { id: "changdong", name: "창동", x: 1032, y: 60, lines: ["1", "4"] },
    "nokcheon": { id: "nokcheon", name: "녹천", x: 1054, y: 85, lines: ["1"] },
    "wolgye": { id: "wolgye", name: "월계", x: 1096, y: 127, lines: ["1"] },
    "kwangwoon_univ": { id: "kwangwoon_univ", name: "광운대", x: 1121, y: 161, lines: ["1"] },
    "seokgye": { id: "seokgye", name: "석계", x: 1149, y: 196, lines: ["1", "6"] },
    "sinimun": { id: "sinimun", name: "신이문", x: 1177, y: 248, lines: ["1"] },
    "hufs": { id: "hufs", name: "외대앞", x: 1169, y: 279, lines: ["1"] },
    "hoegi": { id: "hoegi", name: "회기", x: 1152, y: 306, lines: ["1", "GJ"] },
    "cheongnyangni": { id: "cheongnyangni", name: "청량리", x: 1119, y: 338, lines: ["1", "SU", "GJ"] },
    "jegi": { id: "jegi", name: "제기동", x: 1061, y: 336, lines: ["1"] },
    "dongmyo": { id: "dongmyo", name: "동묘앞", x: 960, y: 349, lines: ["1", "6"] },
    "dongdaemun": { id: "dongdaemun", name: "동대문", x: 917, y: 356, lines: ["1", "4"] },
    "jongno5ga": { id: "jongno5ga", name: "종로5가", x: 864, y: 355, lines: ["1"] },
    "jongno3ga": { id: "jongno3ga", name: "종로3가", x: 793, y: 353, lines: ["1", "3", "5"] },
    "jonggak": { id: "jonggak", name: "종각", x: 731, y: 360, lines: ["1"] },
    "seoul": { id: "seoul", name: "서울역", x: 632, y: 485, lines: ["1", "4", "AREX", "GJ"] },
    "namyeong": { id: "namyeong", name: "남영", x: 625, y: 606, lines: ["1"] },
    "yongsan": { id: "yongsan", name: "용산", x: 577, y: 720, lines: ["1", "GJ"] },
    "noryangjin": { id: "noryangjin", name: "노량진", x: 475, y: 842, lines: ["1", "9"] },
    "daebang": { id: "daebang", name: "대방", x: 406, y: 837, lines: ["1"] },
    "singil": { id: "singil", name: "신길", x: 369, y: 802, lines: ["1", "5"] },
    "yeongdeungpo": { id: "yeongdeungpo", name: "영등포", x: 337, y: 805, lines: ["1"] },
    "guro": { id: "guro", name: "구로", x: 274, y: 865, lines: ["1"] },
    "gasan_digital": { id: "gasan_digital", name: "가산디지털단지", x: 301, y: 989, lines: ["1", "7"] },
    "doksan": { id: "doksan", name: "독산", x: 344, y: 1059, lines: ["1"] },
    "guil": { id: "guil", name: "구일", x: 257, y: 892, lines: ["1"] },
    "gaebong": { id: "gaebong", name: "개봉", x: 225, y: 892, lines: ["1"] },
    "oryu_dong": { id: "oryu_dong", name: "오류동", x: 196, y: 880, lines: ["1"] },
    "onsu": { id: "onsu", name: "온수", x: 162, y: 878, lines: ["1", "7"] },
    "gupabal": { id: "gupabal", name: "구파발", x: 491, y: 128, lines: ["3"] },
    "yeonsinnae": { id: "yeonsinnae", name: "연신내", x: 475, y: 185, lines: ["3", "6"] },
    "bulgwang": { id: "bulgwang", name: "불광", x: 497, y: 209, lines: ["3", "6"] },
    "nokbeon": { id: "nokbeon", name: "녹번", x: 508, y: 242, lines: ["3"] },
    "hongje": { id: "hongje", name: "홍제", x: 529, y: 290, lines: ["3"] },
    "muakjae": { id: "muakjae", name: "무악재", x: 548, y: 317, lines: ["3"] },
    "dongnimmun": { id: "dongnimmun", name: "독립문", x: 580, y: 356, lines: ["3"] },
    "gyeongbokgung": { id: "gyeongbokgung", name: "경복궁", x: 673, y: 334, lines: ["3"] },
    "anguk": { id: "anguk", name: "안국", x: 751, y: 322, lines: ["3"] },
    "chungmuro": { id: "chungmuro", name: "충무로", x: 809, y: 421, lines: ["3", "4"] },
    "dongguk_univ": { id: "dongguk_univ", name: "동대입구", x: 896, y: 439, lines: ["3"] },
    "yaksu": { id: "yaksu", name: "약수", x: 938, y: 482, lines: ["3", "6"] },
    "geumho": { id: "geumho", name: "금호", x: 980, y: 542, lines: ["3"] },
    "oksu": { id: "oksu", name: "옥수", x: 1001, y: 607, lines: ["3", "GJ"] },
    "apgujeong": { id: "apgujeong", name: "압구정", x: 1067, y: 748, lines: ["3"] },
    "sinsa": { id: "sinsa", name: "신사", x: 1006, y: 850, lines: ["3", "SB"] },
    "jamwon": { id: "jamwon", name: "잠원", x: 940, y: 886, lines: ["3"] },
    "express_bus": { id: "express_bus", name: "고속터미널", x: 888, y: 949, lines: ["3", "7", "9"] },
    "nambu_terminal": { id: "nambu_terminal", name: "남부터미널", x: 946, y: 1063, lines: ["3"] },
    "yangjae": { id: "yangjae", name: "양재", x: 1049, y: 1051, lines: ["3", "SB"] },
    "maebong": { id: "maebong", name: "매봉", x: 1115, y: 1022, lines: ["3"] },
    "dogok": { id: "dogok", name: "도곡", x: 1156, y: 987, lines: ["3", "SU"] },
    "daechi": { id: "daechi", name: "대치", x: 1200, y: 956, lines: ["3"] },
    "hangnyeoul": { id: "hangnyeoul", name: "학여울", x: 1230, y: 936, lines: ["3"] },
    "daecheong": { id: "daecheong", name: "대청", x: 1260, y: 947, lines: ["3"] },
    "irwon": { id: "irwon", name: "일원", x: 1261, y: 994, lines: ["3"] },
    "suseo": { id: "suseo", name: "수서", x: 1320, y: 956, lines: ["3", "SU"] },
    "garak_market": { id: "garak_market", name: "가락시장", x: 1370, y: 912, lines: ["3", "8"] },
    "ogeum": { id: "ogeum", name: "오금", x: 1394, y: 849, lines: ["3", "5"] },
    "nowon": { id: "nowon", name: "노원", x: 1081, y: 66, lines: ["4", "7"] },
    "ssangmun": { id: "ssangmun", name: "쌍문", x: 984, y: 63, lines: ["4"] },
    "suyu": { id: "suyu", name: "수유", x: 954, y: 85, lines: ["4"] },
    "mia": { id: "mia", name: "미아", x: 964, y: 119, lines: ["4"] },
    "miasageori": { id: "miasageori", name: "미아사거리", x: 994, y: 168, lines: ["4"] },
    "gireum": { id: "gireum", name: "길음", x: 979, y: 203, lines: ["4"] },
    "sungshin": { id: "sungshin", name: "성신여대입구", x: 942, y: 244, lines: ["4"] },
    "hansung": { id: "hansung", name: "한성대입구", x: 884, y: 259, lines: ["4"] },
    "hyehwa": { id: "hyehwa", name: "혜화", x: 860, y: 289, lines: ["4"] },
    "myeongdong": { id: "myeongdong", name: "명동", x: 749, y: 425, lines: ["4"] },
    "hoehyeon": { id: "hoehyeon", name: "회현", x: 688, y: 448, lines: ["4"] },
    "sookmyung": { id: "sookmyung", name: "숙대입구", x: 632, y: 573, lines: ["4"] },
    "samgakji": { id: "samgakji", name: "삼각지", x: 634, y: 675, lines: ["4", "6"] },
    "sinyongsan": { id: "sinyongsan", name: "신용산", x: 606, y: 732, lines: ["4"] },
    "ichon": { id: "ichon", name: "이촌", x: 650, y: 801, lines: ["4", "GJ"] },
    "dongjak": { id: "dongjak", name: "동작", x: 703, y: 960, lines: ["4", "9"] },
    "isu": { id: "isu", name: "총신대입구(이수)", x: 732, y: 1061, lines: ["4", "7"] },
    "namtaeryeong": { id: "namtaeryeong", name: "남태령", x: 782, y: 1165, lines: ["4"] },
    "gimpo_airport": { id: "gimpo_airport", name: "김포공항", x: 101, y: 544, lines: ["5", "9", "AREX"] },
    "songjeong": { id: "songjeong", name: "송정", x: 130, y: 559, lines: ["5"] },
    "magok": { id: "magok", name: "마곡", x: 157, y: 543, lines: ["5"] },
    "balsan": { id: "balsan", name: "발산", x: 187, y: 556, lines: ["5"] },
    "ujangsan": { id: "ujangsan", name: "우장산", x: 166, y: 604, lines: ["5"] },
    "hwagok": { id: "hwagok", name: "화곡", x: 172, y: 638, lines: ["5"] },
    "sinjeong": { id: "sinjeong", name: "신정", x: 193, y: 726, lines: ["5"] },
    "mokdong": { id: "mokdong", name: "목동", x: 224, y: 716, lines: ["5"] },
    "omokgyo": { id: "omokgyo", name: "오목교", x: 242, y: 742, lines: ["5"] },
    "yangpyeong": { id: "yangpyeong", name: "양평", x: 271, y: 729, lines: ["5"] },
    "yeongdeungpo_market": { id: "yeongdeungpo_market", name: "영등포시장", x: 326, y: 759, lines: ["5"] },
    "yeouido": { id: "yeouido", name: "여의도", x: 391, y: 773, lines: ["5", "9"] },
    "yeouinaru": { id: "yeouinaru", name: "여의나루", x: 422, y: 735, lines: ["5"] },
    "mapo": { id: "mapo", name: "마포", x: 478, y: 633, lines: ["5"] },
    "gongdeok": { id: "gongdeok", name: "공덕", x: 509, y: 590, lines: ["5", "6", "AREX", "GJ"] },
    "aeogae": { id: "aeogae", name: "애오개", x: 545, y: 508, lines: ["5"] },
    "seodaemun": { id: "seodaemun", name: "서대문", x: 619, y: 404, lines: ["5"] },
    "gwanghwamun": { id: "gwanghwamun", name: "광화문", x: 690, y: 361, lines: ["5"] },
    "cheonggu": { id: "cheonggu", name: "청구", x: 955, y: 437, lines: ["5", "6"] },
    "singeumho": { id: "singeumho", name: "신금호", x: 1008, y: 488, lines: ["5"] },
    "haengdang": { id: "haengdang", name: "행당", x: 1059, y: 473, lines: ["5"] },
    "majang": { id: "majang", name: "마장", x: 1119, y: 426, lines: ["5"] },
    "dapsimni": { id: "dapsimni", name: "답십리", x: 1165, y: 429, lines: ["5"] },
    "janghanpyeong": { id: "janghanpyeong", name: "장한평", x: 1223, y: 477, lines: ["5"] },
    "gunja": { id: "gunja", name: "군자", x: 1281, y: 519, lines: ["5", "7"] },
    "achasan": { id: "achasan", name: "아차산", x: 1318, y: 561, lines: ["5"] },
    "gwangnaru": { id: "gwangnaru", name: "광나루", x: 1359, y: 608, lines: ["5"] },
    "cheonho": { id: "cheonho", name: "천호", x: 1406, y: 649, lines: ["5", "8"] },
    "gangdong": { id: "gangdong", name: "강동", x: 1424, y: 675, lines: ["5"] },
    "gildong": { id: "gildong", name: "길동", x: 1447, y: 652, lines: ["5"] },
    "gubeundari": { id: "gubeundari", name: "굽은다리", x: 1446, y: 620, lines: ["5"] },
    "myeongil": { id: "myeongil", name: "명일", x: 1442, y: 589, lines: ["5"] },
    "godeok": { id: "godeok", name: "고덕", x: 1460, y: 562, lines: ["5"] },
    "sangil_dong": { id: "sangil_dong", name: "상일동", x: 1492, y: 566, lines: ["5"] },
    "dunchon_dong": { id: "dunchon_dong", name: "둔촌동", x: 1430, y: 716, lines: ["5"] },
    "olympic_park": { id: "olympic_park", name: "올림픽공원", x: 1425, y: 779, lines: ["5", "9"] },
    "bangi": { id: "bangi", name: "방이", x: 1408, y: 820, lines: ["5"] },
    "gaerong": { id: "gaerong", name: "개롱", x: 1414, y: 874, lines: ["5"] },
    "geoyeo": { id: "geoyeo", name: "거여", x: 1432, y: 900, lines: ["5"] },
    "macheon": { id: "macheon", name: "마천", x: 1448, y: 871, lines: ["5"] },
    "eungam": { id: "eungam", name: "응암", x: 423, y: 277, lines: ["6"] },
    "yeokchon": { id: "yeokchon", name: "역촌", x: 466, y: 239, lines: ["6"] },
    "dokbawi": { id: "dokbawi", name: "독바위", x: 521, y: 175, lines: ["6"] },
    "gusan": { id: "gusan", name: "구산", x: 445, y: 216, lines: ["6"] },
    "saejeol": { id: "saejeol", name: "새절", x: 405, y: 315, lines: ["6"] },
    "jeungsan": { id: "jeungsan", name: "증산", x: 379, y: 358, lines: ["6"] },
    "dmc": { id: "dmc", name: "디지털미디어시티", x: 338, y: 414, lines: ["6", "AREX", "GJ"] },
    "worldcup_stadium": { id: "worldcup_stadium", name: "월드컵경기장", x: 325, y: 451, lines: ["6"] },
    "mapo_gu_office": { id: "mapo_gu_office", name: "마포구청", x: 333, y: 482, lines: ["6"] },
    "mangwon": { id: "mangwon", name: "망원", x: 347, y: 526, lines: ["6"] },
    "sangsu": { id: "sangsu", name: "상수", x: 385, y: 577, lines: ["6"] },
    "gwangheungchang": { id: "gwangheungchang", name: "광흥창", x: 420, y: 575, lines: ["6"] },
    "daeheung": { id: "daeheung", name: "대흥", x: 465, y: 566, lines: ["6"] },
    "hyochang_park": { id: "hyochang_park", name: "효창공원앞", x: 561, y: 631, lines: ["6", "GJ"] },
    "noksapyeong": { id: "noksapyeong", name: "녹사평", x: 745, y: 679, lines: ["6"] },
    "itaewon": { id: "itaewon", name: "이태원", x: 809, y: 678, lines: ["6"] },
    "hangangjin": { id: "hangangjin", name: "한강진", x: 877, y: 619, lines: ["6"] },
    "beotigogae": { id: "beotigogae", name: "버티고개", x: 917, y: 536, lines: ["6"] },
    "changsin": { id: "changsin", name: "창신", x: 945, y: 309, lines: ["6"] },
    "bomun": { id: "bomun", name: "보문", x: 965, y: 282, lines: ["6"] },
    "anam": { id: "anam", name: "안암", x: 1021, y: 286, lines: ["6"] },
    "korea_univ": { id: "korea_univ", name: "고려대", x: 1052, y: 272, lines: ["6"] },
    "wolgok": { id: "wolgok", name: "월곡", x: 1059, y: 226, lines: ["6"] },
    "sangwolgok": { id: "sangwolgok", name: "상월곡", x: 1087, y: 212, lines: ["6"] },
    "dolgoji": { id: "dolgoji", name: "돌곶이", x: 1119, y: 205, lines: ["6"] },
    "taereung": { id: "taereung", name: "태릉입구", x: 1181, y: 198, lines: ["6", "7"] },
    "hwarangdae": { id: "hwarangdae", name: "화랑대", x: 1213, y: 198, lines: ["6"] },
    "bonghwasan": { id: "bonghwasan", name: "봉화산", x: 1237, y: 219, lines: ["6"] },
    "junggye": { id: "junggye", name: "중계", x: 1103, y: 96, lines: ["7"] },
    "hagye": { id: "hagye", name: "하계", x: 1128, y: 125, lines: ["7"] },
    "gongneung": { id: "gongneung", name: "공릉", x: 1162, y: 166, lines: ["7"] },
    "meokgol": { id: "meokgol", name: "먹골", x: 1201, y: 228, lines: ["7"] },
    "junghwa": { id: "junghwa", name: "중화", x: 1219, y: 265, lines: ["7"] },
    "sangbong": { id: "sangbong", name: "상봉", x: 1246, y: 303, lines: ["7", "GJ"] },
    "myeonmok": { id: "myeonmok", name: "면목", x: 1268, y: 342, lines: ["7"] },
    "sagajeong": { id: "sagajeong", name: "사가정", x: 1283, y: 385, lines: ["7"] },
    "yongmasan": { id: "yongmasan", name: "용마산", x: 1286, y: 421, lines: ["7"] },
    "junggok": { id: "junggok", name: "중곡", x: 1288, y: 466, lines: ["7"] },
    "children_park": { id: "children_park", name: "어린이대공원", x: 1272, y: 578, lines: ["7"] },
    "ttukseom_park": { id: "ttukseom_park", name: "뚝섬유원지", x: 1247, y: 698, lines: ["7"] },
    "cheongdam": { id: "cheongdam", name: "청담", x: 1187, y: 798, lines: ["7"] },
    "gangnam_gu_office": { id: "gangnam_gu_office", name: "강남구청", x: 1128, y: 824, lines: ["7", "SU"] },
    "hak_dong": { id: "hak_dong", name: "학동", x: 1074, y: 856, lines: ["7"] },
    "nonhyeon": { id: "nonhyeon", name: "논현", x: 1008, y: 892, lines: ["7", "SB"] },
    "banpo": { id: "banpo", name: "반포", x: 937, y: 922, lines: ["7"] },
    "naebang": { id: "naebang", name: "내방", x: 806, y: 1057, lines: ["7"] },
    "namseong": { id: "namseong", name: "남성", x: 668, y: 1063, lines: ["7"] },
    "soongsil": { id: "soongsil", name: "숭실대입구", x: 554, y: 978, lines: ["7"] },
    "sangdo": { id: "sangdo", name: "상도", x: 516, y: 931, lines: ["7"] },
    "jangseungbaegi": { id: "jangseungbaegi", name: "장승배기", x: 471, y: 907, lines: ["7"] },
    "sindaebang_samgeori": { id: "sindaebang_samgeori", name: "신대방삼거리", x: 431, y: 929, lines: ["7"] },
    "boramae": { id: "boramae", name: "보라매", x: 399, y: 920, lines: ["7"] },
    "sinpung": { id: "sinpung", name: "신풍", x: 359, y: 906, lines: ["7"] },
    "namguro": { id: "namguro", name: "남구로", x: 310, y: 958, lines: ["7"] },
    "cheolsan": { id: "cheolsan", name: "철산", x: 269, y: 990, lines: ["7"] },
    "gwangmyeong_sageori": { id: "gwangmyeong_sageori", name: "광명사거리", x: 236, y: 963, lines: ["7"] },
    "cheonwang": { id: "cheonwang", name: "천왕", x: 195, y: 915, lines: ["7"] },
    "amsa": { id: "amsa", name: "암사", x: 1410, y: 586, lines: ["8"] },
    "gangdong_gu_office": { id: "gangdong_gu_office", name: "강동구청", x: 1401, y: 700, lines: ["8"] },
    "mongchontoseong": { id: "mongchontoseong", name: "몽촌토성", x: 1366, y: 779, lines: ["8"] },
    "seokchon": { id: "seokchon", name: "석촌", x: 1355, y: 850, lines: ["8", "9"] },
    "songpa": { id: "songpa", name: "송파", x: 1364, y: 881, lines: ["8"] },
    "munjeong": { id: "munjeong", name: "문정", x: 1373, y: 944, lines: ["8"] },
    "jangji": { id: "jangji", name: "장지", x: 1373, y: 976, lines: ["8"] },
    "bokjeong": { id: "bokjeong", name: "복정", x: 1362, y: 1012, lines: ["8", "SU"] },
    "sanseong": { id: "sanseong", name: "산성", x: 1392, y: 1036, lines: ["8"] },
    "namhansanseong": { id: "namhansanseong", name: "남한산성입구", x: 1417, y: 1056, lines: ["8"] },
    "dandaeogeori": { id: "dandaeogeori", name: "단대오거리", x: 1396, y: 1079, lines: ["8"] },
    "sinheung": { id: "sinheung", name: "신흥", x: 1373, y: 1101, lines: ["8"] },
    "sujin": { id: "sujin", name: "수진", x: 1352, y: 1126, lines: ["8"] },
    "moran": { id: "moran", name: "모란", x: 1313, y: 1158, lines: ["8", "SU"] },
    "sinbanghwa": { id: "sinbanghwa", name: "신방화", x: 134, y: 519, lines: ["9"] },
    "magongnaru": { id: "magongnaru", name: "마곡나루", x: 166, y: 513, lines: ["9", "AREX"] },
    "yangcheon_hyanggyo": { id: "yangcheon_hyanggyo", name: "양천향교", x: 192, y: 494, lines: ["9"] },
    "gayang": { id: "gayang", name: "가양", x: 203, y: 524, lines: ["9"] },
    "jeungmi": { id: "jeungmi", name: "증미", x: 224, y: 548, lines: ["9"] },
    "deungchon": { id: "deungchon", name: "등촌", x: 219, y: 579, lines: ["9"] },
    "yeomchang": { id: "yeomchang", name: "염창", x: 242, y: 602, lines: ["9"] },
    "sinmokdong": { id: "sinmokdong", name: "신목동", x: 268, y: 619, lines: ["9"] },
    "seonyudo": { id: "seonyudo", name: "선유도", x: 289, y: 654, lines: ["9"] },
    "national_assembly": { id: "national_assembly", name: "국회의사당", x: 364, y: 723, lines: ["9"] },
    "saetgang": { id: "saetgang", name: "샛강", x: 413, y: 806, lines: ["9"] },
    "nodeul": { id: "nodeul", name: "노들", x: 529, y: 862, lines: ["9"] },
    "heukseok": { id: "heukseok", name: "흑석", x: 595, y: 904, lines: ["9"] },
    "gubanpo": { id: "gubanpo", name: "구반포", x: 761, y: 975, lines: ["9"] },
    "sinbanpo": { id: "sinbanpo", name: "신반포", x: 821, y: 962, lines: ["9"] },
    "sapyeong": { id: "sapyeong", name: "사평", x: 960, y: 946, lines: ["9"] },
    "sinnonhyeon": { id: "sinnonhyeon", name: "신논현", x: 1022, y: 936, lines: ["9", "SB"] },
    "eonju": { id: "eonju", name: "언주", x: 1077, y: 907, lines: ["9"] },
    "seonjeongneung": { id: "seonjeongneung", name: "선정릉", x: 1132, y: 876, lines: ["9", "SU"] },
    "samseong_jungang": { id: "samseong_jungang", name: "삼성중앙", x: 1180, y: 846, lines: ["9"] },
    "bongeunsa": { id: "bongeunsa", name: "봉은사", x: 1211, y: 831, lines: ["9"] },
    "samjeon": { id: "samjeon", name: "삼전", x: 1297, y: 870, lines: ["9"] },
    "seokchon_gobun": { id: "seokchon_gobun", name: "석촌고분", x: 1328, y: 879, lines: ["9"] },
    "songpanaru": { id: "songpanaru", name: "송파나루", x: 1373, y: 821, lines: ["9"] },
    "hanseong_baekje": { id: "hanseong_baekje", name: "한성백제", x: 1395, y: 791, lines: ["9"] },
    "dunchon_oryun": { id: "dunchon_oryun", name: "둔촌오륜", x: 1438, y: 750, lines: ["9"] },
    "vhs_medical": { id: "vhs_medical", name: "중앙보훈병원", x: 1460, y: 705, lines: ["9"] },
    "yangjae_forest": { id: "yangjae_forest", name: "양재시민의숲", x: 1051, y: 1114, lines: ["SB"] },
    "cheonggyesan": { id: "cheonggyesan", name: "청계산입구", x: 1098, y: 1186, lines: ["SB"] },
    "pangyo": { id: "pangyo", name: "판교", x: 1210, y: 1276, lines: ["SB"] },
    "jeongja": { id: "jeongja", name: "정자", x: 1173, y: 1340, lines: ["SB", "SU"] },
    "seoul_forest": { id: "seoul_forest", name: "서울숲", x: 1152, y: 598, lines: ["SU"] },
    "apgujeong_rodeo": { id: "apgujeong_rodeo", name: "압구정로데오", x: 1133, y: 740, lines: ["SU"] },
    "hanti": { id: "hanti", name: "한티", x: 1156, y: 955, lines: ["SU"] },
    "guryong": { id: "guryong", name: "구룡", x: 1174, y: 1014, lines: ["SU"] },
    "gaepo_dong": { id: "gaepo_dong", name: "개포동", x: 1203, y: 988, lines: ["SU"] },
    "daemosan": { id: "daemosan", name: "대모산입구", x: 1232, y: 968, lines: ["SU"] },
    "gachon_univ": { id: "gachon_univ", name: "가천대", x: 1333, y: 1097, lines: ["SU"] },
    "taepyeong": { id: "taepyeong", name: "태평", x: 1320, y: 1127, lines: ["SU"] },
    "yatap": { id: "yatap", name: "야탑", x: 1283, y: 1218, lines: ["SU"] },
    "imae": { id: "imae", name: "이매", x: 1261, y: 1260, lines: ["SU"] },
    "seohyeon": { id: "seohyeon", name: "서현", x: 1239, y: 1291, lines: ["SU"] },
    "sunae": { id: "sunae", name: "수내", x: 1203, y: 1312, lines: ["SU"] },
    "susaek": { id: "susaek", name: "수색", x: 327, y: 384, lines: ["GJ"] },
    "gajwa": { id: "gajwa", name: "가좌", x: 377, y: 443, lines: ["GJ"] },
    "seogang_univ": { id: "seogang_univ", name: "서강대", x: 439, y: 540, lines: ["GJ"] },
    "seobinggo": { id: "seobinggo", name: "서빙고", x: 760, y: 834, lines: ["GJ"] },
    "hannam": { id: "hannam", name: "한남", x: 936, y: 733, lines: ["GJ"] },
    "eungbong": { id: "eungbong", name: "응봉", x: 1097, y: 540, lines: ["GJ"] },
    "jungnang": { id: "jungnang", name: "중랑", x: 1215, y: 297, lines: ["GJ"] },
    "mangu": { id: "mangu", name: "망우", x: 1276, y: 294, lines: ["GJ"] },
    "sinchon_gj": { id: "sinchon_gj", name: "신촌(경의중앙)", x: 477, y: 469, lines: ["GJ"] }
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
      E("wangsimni-e4", "5호선 환승통로", "transfer", "B2 ↔ B3 5호선 승강장"),
      E("wangsimni-e5", "수인분당선 환승통로", "transfer", "B2 ↔ B4 수인분당선 승강장")
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
      E("sports_complex-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("sports_complex-e5", "9호선 환승통로", "transfer", "B2 ↔ B3 9호선 승강장")
    ],
    "samseong": [
      E("samseong-e1", "5번 출구 (코엑스)", "exit", "지상 ↔ B1 대합실"),
      E("samseong-e2", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("samseong-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
    ],
    "seolleung": [
      E("seolleung-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seolleung-e2", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("seolleung-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("seolleung-e4", "수인분당선 환승통로", "transfer", "B2 ↔ B4 수인분당선 승강장")
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
      E("gangnam-e4", "2호선 승강장 (외선)", "platform", "B1 대합실 ↔ B2 승강장"),
      E("gangnam-e5", "신분당선 환승통로", "transfer", "B2 ↔ B4 신분당선 승강장")
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
      E("dangsan-e4", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("dangsan-e5", "9호선 환승통로", "transfer", "B2 ↔ B3 9호선 승강장")
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
      E("hongik-e3", "2호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("hongik-e4", "공항철도 환승통로", "transfer", "B2 ↔ B6 공항철도 승강장"),
      E("hongik-e5", "경의중앙선 환승통로", "transfer", "B2 ↔ B5 경의중앙선 승강장")
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
      E("seoul-e4", "4호선 환승통로", "transfer", "B2 ↔ B3 4호선 승강장", "MAINTENANCE", "노후 설비 교체 공사 (~11/15)"),
      E("seoul-e5", "공항철도 환승통로", "transfer", "B1 ↔ B7 공항철도 승강장")
    ],
    "express_bus": [
      E("express_bus-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("express_bus-e2", "8-1번 출구 (경부선 터미널)", "exit", "지상 ↔ B1 대합실"),
      E("express_bus-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B3 승강장"),
      E("express_bus-e4", "7호선 환승통로", "transfer", "B3 ↔ B5 7호선 승강장", "UNAVAILABLE", "와이어로프 점검 중 이상 발견 — 운행 중지"),
      E("express_bus-e5", "9호선 환승통로", "transfer", "B3 ↔ B4 9호선 승강장")
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
      E("yeouido-e4", "5호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("yeouido-e5", "9호선 환승통로", "transfer", "B2 ↔ B3 9호선 승강장")
    ],
    "gimpo_airport": [
      E("gimpo_airport-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gimpo_airport-e2", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gimpo_airport-e3", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("gimpo_airport-e4", "5호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("gimpo_airport-e5", "9호선 환승통로", "transfer", "B2 ↔ B3 9호선 승강장")
    ],
    "yangjae": [
      E("yangjae-e1", "-3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yangjae-e2", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("yangjae-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("yangjae-e4", "신분당선 환승통로", "transfer", "B2 ↔ B3 신분당선 승강장")
    ],
    "suseo": [
      E("suseo-e1", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("suseo-e2", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("suseo-e3", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("suseo-e4", "수인분당선 환승통로", "transfer", "B2 ↔ B3 수인분당선 승강장")
    ],
    "pangyo": [
      E("pangyo-e1", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("pangyo-e2", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("pangyo-e3", "신분당선 승강장", "platform", "B1 대합실 ↔ B2 승강장")
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
      E("yongsan-e3", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("yongsan-e4", "경의중앙선 환승통로", "transfer", "B2 ↔ B3 경의중앙선 승강장")
    ],
    "noryangjin": [
      E("noryangjin-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("noryangjin-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("noryangjin-e3", "1호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("noryangjin-e4", "9호선 환승통로", "transfer", "B2 ↔ B3 9호선 승강장")
    ],
    "sinsa": [
      E("sinsa-e1", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinsa-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinsa-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinsa-e4", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("sinsa-e5", "신분당선 환승통로", "transfer", "B2 ↔ B3 신분당선 승강장")
    ],
    "nonhyeon": [
      E("nonhyeon-e1", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nonhyeon-e2", "9번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nonhyeon-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("nonhyeon-e4", "7호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("nonhyeon-e5", "신분당선 환승통로", "transfer", "B2 ↔ B3 신분당선 승강장")
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
      E("oksu-e4", "3호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("oksu-e5", "경의중앙선 환승통로", "transfer", "B2 ↔ B3 경의중앙선 승강장")
    ],
    "dongjak": [
      E("dongjak-e1", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongjak-e2", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongjak-e3", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dongjak-e4", "4호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("dongjak-e5", "9호선 환승통로", "transfer", "B2 ↔ B3 9호선 승강장")
    ],
    "sinnonhyeon": [
      E("sinnonhyeon-e1", "1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinnonhyeon-e2", "7번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinnonhyeon-e3", "8번 출구", "exit", "지상 ↔ B1 대합실"),
      E("sinnonhyeon-e4", "9호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("sinnonhyeon-e5", "신분당선 환승통로", "transfer", "B2 ↔ B3 신분당선 승강장")
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
      E("seokchon-e4", "8호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("seokchon-e5", "9호선 환승통로", "transfer", "B2 ↔ B3 9호선 승강장")
    ],
    "jeongja": [
      E("jeongja-e1", "4번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jeongja-e2", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jeongja-e3", "10번 출구", "exit", "지상 ↔ B1 대합실"),
      E("jeongja-e4", "신분당선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("jeongja-e5", "수인분당선 환승통로", "transfer", "B2 ↔ B3 수인분당선 승강장")
    ],
    "dmc": [
      E("dmc-e1", "2번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dmc-e2", "5번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dmc-e3", "6번 출구", "exit", "지상 ↔ B1 대합실"),
      E("dmc-e4", "6호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("dmc-e5", "공항철도 환승통로", "transfer", "B2 ↔ B3 공항철도 승강장")
    ],
    "magongnaru": [
      E("magongnaru-e1", "-3번 출구", "exit", "지상 ↔ B1 대합실"),
      E("magongnaru-e2", "-1번 출구", "exit", "지상 ↔ B1 대합실"),
      E("magongnaru-e3", "9호선 승강장", "platform", "B1 대합실 ↔ B2 승강장"),
      E("magongnaru-e4", "공항철도 환승통로", "transfer", "B2 ↔ B3 공항철도 승강장")
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
    "gangnam>yangjae": "신분당선 양재역에서 하차 후 1번 출구 엘리베이터 이용. 강남대로를 따라 도보 약 15분 (1.2km), 또는 140·441번 버스 2정거장.",
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
    viewBox: { width: 1600, height: 1400 },
    lines: lines,
    stations: stations,
    elevators: elevators,
    headways: { "1": 6, "2": 3, "3": 5, "4": 5, "5": 5, "6": 7, "7": 5, "8": 6, "9": 5, "SB": 6, "SU": 7, "AREX": 10, "GJ": 12 },
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
