import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDocFromServer,
  query,
  setDoc,
  updateDoc,
  where,
  getDocsFromServer,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let pb = {
  "5K": null,
  "10K": null,
  "HALF": null,
  "FULL": null
};

const PB_CATEGORIES = [
  { key: "5K", label: "5K", distance: 5 },
  { key: "10K", label: "10K", distance: 10 },
  { key: "HALF", label: "Half", distance: 21.097 },
  { key: "FULL", label: "Full", distance: 42.195 }
];

let chart;
let filterDistance;
let filterPeriod;
let latestRuns = [];
let monthlyGoalKm = 0;
let monthlyGoalLocked = false;
let rankingLoadId = 0;
const INITIAL_VISIBLE_RUN_COUNT = 7;
const RUN_LOAD_MORE_COUNT = 7;
let visibleRunCount = INITIAL_VISIBLE_RUN_COUNT;
let signupInProgress = false;
let selectedAdminMember = null;
let selectedAdminRuns = [];
let editingRun = null;
let editingQualityRun = null;
let latestSuggestions = [];
const CLUB_INVITE_CODE = "NAVIHEAL";
const HOST_EMAIL = "dhseo@skku.edu";
const HOST_NAME = "서동현";
const NOWON_COORDINATES = {
  latitude: 37.6543,
  longitude: 127.0568
};
let runningGroupStandards = [
  {
    group: "A",
    targetMinutes: 190,
    targetLabel: "Sub 3:10",
    intervalPace: "3:45~4:00/km",
    recoveryPace: "5:30~6:00/km",
    monthlyMileage: "300~400",
    members: "안미향, 표수홍"
  },
  {
    group: "B",
    targetMinutes: 200,
    targetLabel: "Sub 3:20",
    intervalPace: "4:00~4:20/km",
    recoveryPace: "5:50~6:20/km",
    monthlyMileage: "250~350",
    members: "정미경, 안윤수, 최영규, 허영재, 서동현"
  },
  {
    group: "C",
    targetMinutes: 220,
    targetLabel: "Sub 3:40",
    intervalPace: "4:20~4:40/km",
    recoveryPace: "6:00~6:40/km",
    monthlyMileage: "200~300",
    members: "김종선, 민선홍, 박정미"
  },
  {
    group: "D",
    targetMinutes: 240,
    targetLabel: "Sub 4:00",
    intervalPace: "4:40~5:00/km",
    recoveryPace: "6:30~7:00/km",
    monthlyMileage: "180~250",
    members: "김수미, 이혜경, 김성균"
  },
  {
    group: "E",
    targetMinutes: 270,
    targetLabel: "Sub 4:30",
    intervalPace: "5:20~5:40/km",
    recoveryPace: "7:00~7:40/km",
    monthlyMileage: "150~220",
    members: "문재연, 박운정, 안효정, 장신영, 정주연"
  },
  {
    group: "S",
    targetMinutes: 300,
    targetLabel: "Sub 5:00",
    intervalPace: "6:00~6:40/km",
    recoveryPace: "7:40~8:30/km",
    monthlyMileage: "120~180",
    members: "김나영, 송경애, 이은주, 현혜인, 조민경"
  }
];
const DEFAULT_RUNNING_GROUP_STANDARDS = runningGroupStandards.map((standard) => ({ ...standard }));
const RUNNING_GROUP_STANDARD_XLSX_PATH = "assets/나빌러닝 조별기준.xlsx";
const RUNNING_GROUP_STANDARD_NOTE = "조편성 조정을 원하시면 코치와 상의해 주세요.";
const OFFICIAL_TRAINING_LABEL = "나빌러닝 정훈";
const UPDATE_NOTICE_VERSION = "20260418-update-notice";
const UPDATE_NOTICE_STORAGE_KEY = `naviheal-update-notice-${UPDATE_NOTICE_VERSION}`;
let runningGroupStandardsLoadedFromXlsx = false;
const QUALITY_MONTHLY_SCHEDULE = {
  4: {
    title: "4월 정훈 - 기초 지구력 + 페이스 적응",
    purpose: "기초 + LT",
    note: "",
    workouts: [
      { date: "4/7", text: "1600 x 4 / E,S 3" },
      { date: "4/14", text: "1000 x 4 / E,S 3" },
      { date: "4/21", text: "600 x 6 / E,S 4" },
      { date: "4/28", text: "5K TT" }
    ]
  },
  5: {
    title: "5월 정훈 - VO2max 강화",
    purpose: "심폐능력 끌어올리는 달",
    note: "",
    workouts: [
      { date: "5/5", text: "800 x 6" },
      { date: "5/12", text: "1200 x 4" },
      { date: "5/19", text: "1000 x 5" },
      { date: "5/26", text: "5K TT" }
    ]
  },
  6: {
    title: "6월 정훈 - 스피드 지구력",
    purpose: "기초 + LT",
    note: "",
    workouts: [
      { date: "6/2", text: "600 x 8" },
      { date: "6/9", text: "1000 x 5" },
      { date: "6/16", text: "1600 x 3" },
      { date: "6/23", text: "400 x 10" },
      { date: "6/30", text: "5K TT" }
    ]
  },
  7: {
    title: "7월 정훈 - 여름 유지기",
    purpose: "심폐 유지",
    note: "더위 고려하여 볼륨 약간 감소",
    workouts: [
      { date: "7/7", text: "1000 x 4" },
      { date: "7/14", text: "1200 x 4" },
      { date: "7/21", text: "800 x 6" },
      { date: "7/28", text: "5K TT" }
    ]
  },
  8: {
    title: "8월 정훈 - 마라톤 인터벌 전환",
    purpose: "심폐 유지",
    note: "풀코스용 LT 적응 시작",
    workouts: [
      { date: "8/4", text: "2000 x 3" },
      { date: "8/11", text: "1600 x 4" },
      { date: "8/18", text: "1000 x 5" },
      { date: "8/25", text: "5K TT" }
    ]
  },
  9: {
    title: "9월 정훈 - 마라톤 특화",
    purpose: "마라톤 특화",
    note: "후반 버티기 핵심",
    workouts: [
      { date: "9/1", text: "3000 x 2" },
      { date: "9/8", text: "2000 x 3" },
      { date: "9/15", text: "1600 x 4" },
      { date: "9/22", text: "1000 x 4" },
      { date: "9/29", text: "5K TT" }
    ]
  },
  10: {
    title: "10월 정훈 - 테이퍼",
    purpose: "피크",
    note: "컨디션 피크 만들기",
    workouts: [
      { date: "10/6", text: "1000 x 4" },
      { date: "10/13", text: "800 x 4" },
      { date: "10/20", text: "600 x 4" },
      { date: "10/27", text: "400 x 6 (가볍게)" }
    ]
  }
};

const firebaseConfig = {
  apiKey: "AIzaSyAHh5fAEZGVXvky71YgTqD-oG_JssTgzhE",
  authDomain: "naviheal-running-8936d.firebaseapp.com",
  projectId: "naviheal-running-8936d",
  storageBucket: "naviheal-running-8936d.firebasestorage.app",
  messagingSenderId: "65199205198",
  appId: "1:65199205198:web:da81ff75ac189eabe80c1f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function getUserName(user) {
  if (isHostUser(user)) return HOST_NAME;
  return user.displayName || user.email || "이름 없음";
}

function getProfileName(user, profile) {
  if (isHostUser(user)) return HOST_NAME;
  return profile?.name || user?.displayName || user?.email || "이름 없음";
}

function getLoginStatusText(user, profile = null) {
  return `로그인: ${getProfileName(user, profile)} (${user.email})`;
}

function getAuthErrorMessage(error, mode) {
  const contact = "문의: 페이서(01071557374)";

  if (error?.code === "auth/email-already-in-use") {
    return [
      "이미 가입 신청 또는 가입 완료된 이메일입니다.",
      "회원 가입이 아니라 로그인 버튼을 눌러주세요.",
      `승인 대기 중이거나 로그인이 안 되면 ${contact}`
    ].join("\n");
  }

  if (error?.code === "auth/invalid-email") {
    return `이메일 형식을 확인해주세요.\n${contact}`;
  }

  if (error?.code === "auth/weak-password") {
    return `비밀번호는 6자리 이상으로 입력해주세요.\n${contact}`;
  }

  if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password" || error?.code === "auth/user-not-found") {
    return [
      "이메일 또는 비밀번호를 확인해주세요.",
      mode === "login" ? "아직 회원 가입을 하지 않았다면 회원 가입을 먼저 진행해주세요." : "",
      contact
    ].filter(Boolean).join("\n");
  }

  return `${error?.message || "처리 중 오류가 발생했습니다."}\n${contact}`;
}

function isApprovedProfile(user, profile) {
  if (isHostUser(user)) return true;
  return profile?.approved !== false;
}

function isHostUser(user) {
  return user?.email?.toLowerCase() === HOST_EMAIL;
}

function getRegisteredName(user) {
  if (isHostUser(user)) return HOST_NAME;
  return user.displayName || "";
}

async function saveUserProfile(user, displayName = "") {
  if (!user) return;

  const registeredName = displayName || getRegisteredName(user);

  if (!registeredName) return;

  await setDoc(doc(db, "users", user.uid), {
    userId: user.uid,
    email: user.email,
    name: registeredName,
    updatedAt: new Date()
  }, { merge: true });
}

async function createPendingUserProfile(user, displayName) {
  await setDoc(doc(db, "users", user.uid), {
    userId: user.uid,
    email: user.email,
    name: displayName,
    approved: isHostUser(user),
    disabled: false,
    updatedAt: new Date()
  }, { merge: true });
}

async function loadUserProfile(user) {
  if (!user) return null;

  const profileSnapshot = await getDocFromServer(doc(db, "users", user.uid));
  return profileSnapshot.exists() ? profileSnapshot.data() : null;
}

async function ensureUserProfile(user) {
  const profile = await loadUserProfile(user);

  if (profile) {
    return isHostUser(user)
      ? {
          ...profile,
          approved: true,
          disabled: false
        }
      : profile;
  }

  await saveUserProfile(user);
  return loadUserProfile(user);
}

function showDashboardLoadError(error) {
  console.error(error);

  const isPermissionError = error?.code === "permission-denied";
  const message = isPermissionError
    ? "회원 승인 또는 Firestore 권한 문제로 기록을 불러오지 못했습니다. 앱관리자 문의: 페이서(01071557374)"
    : "기록을 불러오는 중 오류가 발생했습니다. 새로고침 후 다시 확인해주세요.";

  const recordListStatus = document.getElementById("recordListStatus");
  const rankingStatus = document.getElementById("rankingStatus");
  const monthlyGoalStatus = document.getElementById("monthlyGoalStatus");

  if (recordListStatus) recordListStatus.innerText = message;
  if (rankingStatus) rankingStatus.innerText = message;
  if (monthlyGoalStatus) monthlyGoalStatus.innerText = message;
}

async function loadUserProfileNames() {
  const profileNames = new Map();
  const querySnapshot = await getDocsFromServer(collection(db, "users"));

  querySnapshot.forEach((snapshotDoc) => {
    const data = snapshotDoc.data();

    if (!data.name) return;

    profileNames.set(snapshotDoc.id, data.name);

    if (data.userId) {
      profileNames.set(data.userId, data.name);
    }

    if (data.email) {
      profileNames.set(data.email, data.name);
    }
  });

  return profileNames;
}

function getRankingName(data, profileNames) {
  const userId = data.userId || "";
  const email = data.email || "";
  const savedName = data.name || "";
  const profileName = profileNames.get(userId) || profileNames.get(email);

  if (profileName) return profileName;
  if (savedName && savedName !== email) return savedName;

  return email || "이름 없음";
}

function formatTime(totalMinutes) {
  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatPace(pace) {
  const totalSeconds = Math.round(pace * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}'${seconds.toString().padStart(2, "0")}"/km`;
}

function validateRunInput(distance, time) {
  if (!Number.isFinite(distance) || distance <= 0 || distance > 300) {
    return "거리를 다시 확인해주세요. 0km보다 크고 300km 이하로 입력해야 합니다.";
  }

  if (!Number.isFinite(time) || time <= 0 || time > 1440) {
    return "시간을 다시 확인해주세요. 0분보다 크고 24시간 이하로 입력해야 합니다.";
  }

  const pace = time / distance;

  if (pace < 2) {
    return `입력한 기록의 페이스가 ${formatPace(pace)}로 너무 빠릅니다. 거리나 시간을 다시 확인해주세요.`;
  }

  if (pace > 20) {
    return `입력한 기록의 페이스가 ${formatPace(pace)}로 너무 느립니다. 거리나 시간을 다시 확인해주세요.`;
  }

  return "";
}

function getRunFormElements() {
  return {
    runDateInput: document.getElementById("runDate"),
    runTypeSelect: document.getElementById("runType"),
    distanceSelect: document.getElementById("distanceSelect"),
    distanceInput: document.getElementById("distance"),
    raceFields: document.getElementById("raceFields"),
    raceNameInput: document.getElementById("raceName"),
    raceDateInput: document.getElementById("raceDate"),
    hourInput: document.getElementById("hour"),
    minuteInput: document.getElementById("minute"),
    secondInput: document.getElementById("second"),
    saveBtn: document.getElementById("saveRun"),
    cancelRunEditBtn: document.getElementById("cancelRunEdit"),
    runEditStatus: document.getElementById("runEditStatus")
  };
}

function updateRunFormMode() {
  const { saveBtn, cancelRunEditBtn, runEditStatus } = getRunFormElements();

  if (!saveBtn || !cancelRunEditBtn || !runEditStatus) return;

  const isEditing = Boolean(editingRun);
  saveBtn.innerText = isEditing ? "수정 저장" : "저장";
  cancelRunEditBtn.classList.toggle("hidden", !isEditing);
  runEditStatus.classList.toggle("hidden", !isEditing);

  if (isEditing) {
    const ownerName = editingRun.name || selectedAdminMember?.name || "선택 회원";
    runEditStatus.innerText = `${ownerName} 회원의 ${editingRun.runDate || "-"} 기록을 수정 중입니다.`;
  }
}

function resetRunForm() {
  const {
    runDateInput,
    runTypeSelect,
    distanceSelect,
    distanceInput,
    raceFields,
    raceNameInput,
    raceDateInput,
    hourInput,
    minuteInput,
    secondInput
  } = getRunFormElements();

  editingRun = null;
  runDateInput.value = getTodayDateString();
  runTypeSelect.value = "training";
  distanceSelect.value = "";
  distanceInput.value = "";
  distanceInput.disabled = false;
  distanceInput.placeholder = "km";
  raceFields.classList.add("hidden");
  raceNameInput.value = "";
  raceNameInput.disabled = true;
  raceDateInput.value = "";
  raceDateInput.disabled = true;
  hourInput.value = "";
  minuteInput.value = "";
  secondInput.value = "";
  updateRunFormMode();
}

function setRunFormDistance(distance) {
  const { distanceSelect, distanceInput } = getRunFormElements();
  const presets = ["5", "10", "21.097", "42.195"];
  const preset = presets.find((value) => Math.abs(Number(value) - distance) < 0.001);

  distanceSelect.value = preset || "";
  distanceInput.value = preset ? "" : distance;
  distanceInput.disabled = Boolean(preset);
  distanceInput.placeholder = preset ? "선택 거리 사용" : "km";
}

function beginRunEdit(run) {
  const {
    runDateInput,
    runTypeSelect,
    raceFields,
    raceNameInput,
    raceDateInput,
    hourInput,
    minuteInput,
    secondInput
  } = getRunFormElements();
  const totalSeconds = Math.round(Number(run.time || 0) * 60);

  editingQualityRun = null;
  updateQualityFormMode();
  editingRun = run;
  runDateInput.value = run.runDate || getTodayDateString();
  runTypeSelect.value = run.type || "training";
  setRunFormDistance(Number(run.distance));
  raceFields.classList.toggle("hidden", runTypeSelect.value !== "race");
  raceNameInput.disabled = runTypeSelect.value !== "race";
  raceDateInput.disabled = runTypeSelect.value !== "race";
  raceNameInput.value = run.raceName || "";
  raceDateInput.value = run.raceDate || run.runDate || "";
  hourInput.value = Math.floor(totalSeconds / 3600) || "";
  minuteInput.value = Math.floor((totalSeconds % 3600) / 60) || "";
  secondInput.value = totalSeconds % 60 || "";
  updateRunFormMode();
  document.getElementById("dashboardView").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateQualityFormMode() {
  const saveQualityRunBtn = document.getElementById("saveQualityRun");
  const cancelQualityRunEditBtn = document.getElementById("cancelQualityRunEdit");
  const qualityEditStatus = document.getElementById("qualityEditStatus");

  if (!saveQualityRunBtn || !cancelQualityRunEditBtn || !qualityEditStatus) return;

  const isEditing = Boolean(editingQualityRun);
  saveQualityRunBtn.innerText = isEditing ? "수정 저장" : "결과 저장";
  cancelQualityRunEditBtn.classList.toggle("hidden", !isEditing);
  qualityEditStatus.classList.toggle("hidden", !isEditing);

  if (isEditing) {
    qualityEditStatus.innerText = `${editingQualityRun.runDate || "-"} ${getWorkoutTypeLabel(editingQualityRun.workoutType)} 정훈 기록을 수정 중입니다.`;
  }
}

function beginQualityRunEdit(run) {
  const qualityDateInput = document.getElementById("qualityDate");
  const qualityPlanSelect = document.getElementById("qualityPlanSelect");
  const qualityWorkoutTypeSelect = document.getElementById("qualityWorkoutType");
  const qualityPlannedWorkoutInput = document.getElementById("qualityPlannedWorkout");
  const qualityDistanceInput = document.getElementById("qualityDistance");
  const qualityHourInput = document.getElementById("qualityHour");
  const qualityMinuteInput = document.getElementById("qualityMinute");
  const qualitySecondInput = document.getElementById("qualitySecond");
  const qualitySetResultsInput = document.getElementById("qualitySetResults");
  const qualitySelfRatingSelect = document.getElementById("qualitySelfRating");
  const qualityReflectionInput = document.getElementById("qualityReflection");

  if (!qualityDateInput) return;

  const totalSeconds = Math.round(Number(run.time || 0) * 60);
  editingRun = null;
  updateRunFormMode();
  editingQualityRun = run;
  qualityDateInput.value = run.runDate || getTodayDateString();
  qualityPlanSelect.value = run.qualityPlanDate || "";
  qualityWorkoutTypeSelect.value = run.workoutType || "interval";
  qualityPlannedWorkoutInput.value = run.qualityPlannedWorkout || "";
  qualityDistanceInput.value = run.distance || "";
  qualityHourInput.value = Math.floor(totalSeconds / 3600) || "";
  qualityMinuteInput.value = Math.floor((totalSeconds % 3600) / 60) || "";
  qualitySecondInput.value = totalSeconds % 60 || "";
  qualitySetResultsInput.value = run.qualitySetResults || "";
  fillQualitySetInputs(run.qualitySetResults || "");
  qualitySelfRatingSelect.value = run.qualitySelfRating || "";
  qualityReflectionInput.value = run.qualityReflection || "";
  updateQualityFormMode();
  document.getElementById("qualityTab")?.click();
  document.getElementById("qualityView")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getSuggestionTypeLabel(type) {
  if (type === "error") return "오류";
  if (type === "improvement") return "개선";
  return "기타";
}

function getWorkoutTypeLabel(type) {
  const labels = {
    steady: "일반주",
    interval: "인터벌",
    repetition: "레피티션",
    "build-up": "빌드업",
    tempo: "템포주",
    long: "롱런",
    recovery: "회복주",
    other: "기타"
  };

  return labels[type] || "일반주";
}

function getRunDetailDisplay(run) {
  if (run.type === "race") {
    return run.raceName || "-";
  }

  if ((run.workoutType || "steady") === "steady" && !run.workoutDetail && run.rankingEligible !== false) {
    return "-";
  }

  const label = getWorkoutTypeLabel(run.workoutType || "steady");
  const detail = run.workoutDetail ? ` - ${run.workoutDetail}` : "";
  const rankingText = run.rankingEligible === false ? " · 랭킹 제외" : "";

  return `${label}${detail}${rankingText}`;
}

function parseQualityDetailText(detail = "") {
  const parsed = {};

  String(detail).split(/\n+/).forEach((line) => {
    const match = line.match(/^([^:：]+)[:：]\s*(.*)$/);

    if (!match) return;

    const key = match[1].trim();
    const value = match[2].trim();

    if (key === "계획") parsed.plannedWorkout = value;
    if (key === "결과") parsed.setResults = value;
    if (key === "평가") parsed.selfRating = value;
    if (key === "소감") parsed.reflection = value;
  });

  return parsed;
}

function getQualityDisplayData(run) {
  const parsed = parseQualityDetailText(run.workoutDetail);

  return {
    plannedWorkout: run.qualityPlannedWorkout || parsed.plannedWorkout || "-",
    setResults: run.qualitySetResults || parsed.setResults || "",
    selfRating: run.qualitySelfRating || parsed.selfRating || "-",
    reflection: run.qualityReflection || parsed.reflection || "-"
  };
}

function formatSavedDateTime(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;

  if (!date) return "";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getTodayDateString() {
  return dateToInputValue(new Date());
}

function getWeatherLabel(weatherCode) {
  const weatherLabels = {
    0: "맑음",
    1: "대체로 맑음",
    2: "구름 조금",
    3: "흐림",
    45: "안개",
    48: "서리 안개",
    51: "약한 이슬비",
    53: "이슬비",
    55: "강한 이슬비",
    61: "약한 비",
    63: "비",
    65: "강한 비",
    71: "약한 눈",
    73: "눈",
    75: "강한 눈",
    80: "소나기",
    81: "소나기",
    82: "강한 소나기",
    95: "천둥번개",
    96: "우박 동반",
    99: "강한 우박"
  };

  return weatherLabels[weatherCode] || "날씨 확인";
}

function getWeatherIcon(weatherCode) {
  if ([0, 1].includes(weatherCode)) return "☀";
  if (weatherCode === 2) return "◐";
  if (weatherCode === 3) return "☁";
  if ([45, 48].includes(weatherCode)) return "≋";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) return "☔";
  if ([71, 73, 75].includes(weatherCode)) return "❄";
  if ([95, 96, 99].includes(weatherCode)) return "⚡";
  return "•";
}

function getDustGrade(value, type) {
  if (!Number.isFinite(value)) {
    return { label: "확인 중", className: "normal" };
  }

  const thresholds = type === "pm2_5"
    ? [
        { max: 15, label: "좋음", className: "good" },
        { max: 35, label: "보통", className: "normal" },
        { max: 75, label: "나쁨", className: "bad" }
      ]
    : [
        { max: 30, label: "좋음", className: "good" },
        { max: 80, label: "보통", className: "normal" },
        { max: 150, label: "나쁨", className: "bad" }
      ];

  return thresholds.find((grade) => value <= grade.max) || { label: "매우 나쁨", className: "bad" };
}

function getDustRunningAdvice(grade) {
  if (grade.label === "좋음") {
    return "러닝 좋음";
  }

  if (grade.label === "보통") {
    return "가벼운 러닝";
  }

  return "실내 권장";
}

function getKoreanHourLabel(date) {
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;

  return `${period} ${displayHour}시`;
}

function getHourlyWeatherDayLabel(date) {
  const today = new Date();
  const tomorrow = new Date(today);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "";
  if (target.getTime() === tomorrow.getTime()) return "내일 ";

  return `${target.getMonth() + 1}/${target.getDate()} `;
}

function getHourlyWeatherTrendHtml(hourly) {
  const times = hourly?.time || [];
  const temperatures = hourly?.temperature_2m || [];
  const weatherCodes = hourly?.weather_code || [];
  const precipitationProbabilities = hourly?.precipitation_probability || [];

  if (!times.length || !temperatures.length) return "";

  const now = new Date();
  const picked = times
    .map((time, index) => ({
      index,
      time: new Date(times[index]),
      temperature: Math.round(Number(temperatures[index])),
      weatherCode: Number(weatherCodes[index]),
      precipitationProbability: Math.round(Number(precipitationProbabilities[index]))
    }))
    .filter((entry) => entry.time.getTime() >= now.getTime())
    .slice(0, 6);

  const points = picked
    .filter((entry) => Number.isFinite(entry.temperature))
    .map((entry) => {
      const rain = Number.isFinite(entry.precipitationProbability)
        ? `${entry.precipitationProbability}%`
        : "-";

      return [
        '<span class="hourly-weather-point">',
        `<span class="hourly-weather-time">${getHourlyWeatherDayLabel(entry.time)}${getKoreanHourLabel(entry.time)}</span>`,
        `<span class="hourly-weather-icon">${getWeatherIcon(entry.weatherCode)}</span>`,
        `<span class="hourly-weather-temp">${entry.temperature}°</span>`,
        `<span class="hourly-weather-rain">${rain}</span>`,
        '</span>'
      ].join("");
    });

  return points.length ? `<span class="hourly-weather-strip">${points.join("")}</span>` : "";
}

function renderNowonEnvironment(weatherData, airCurrent) {
  const widget = document.getElementById("nowonEnvironment");

  if (!widget) return;

  const weatherCurrent = weatherData?.current;
  const temperature = Math.round(Number(weatherCurrent?.temperature_2m));
  const humidity = Math.round(Number(weatherCurrent?.relative_humidity_2m));
  const weatherCode = Number(weatherCurrent?.weather_code);
  const pm10 = Math.round(Number(airCurrent?.pm10));
  const pm25 = Math.round(Number(airCurrent?.pm2_5));
  const pm10Grade = getDustGrade(pm10, "pm10");
  const pm25Grade = getDustGrade(pm25, "pm2_5");
  const weatherText = Number.isFinite(temperature)
    ? `${temperature}°C ${getWeatherLabel(weatherCode)}`
    : "날씨 확인 중";
  const humidityText = Number.isFinite(humidity) ? `습도 ${humidity}%` : "현재 날씨";
  const pm10Main = Number.isFinite(pm10) ? `미세먼지 ${pm10Grade.label}` : "미세먼지 확인 중";
  const pm10Sub = Number.isFinite(pm10) ? `${getDustRunningAdvice(pm10Grade)} · ${pm10}㎍/㎥` : "잠시 후 갱신";
  const pm25Main = Number.isFinite(pm25) ? `초미세 ${pm25Grade.label}` : "초미세 확인 중";
  const pm25Sub = Number.isFinite(pm25) ? `${getDustRunningAdvice(pm25Grade)} · ${pm25}㎍/㎥` : "잠시 후 갱신";
  const trendHtml = getHourlyWeatherTrendHtml(weatherData?.hourly);

  widget.innerHTML = [
    `<span class="environment-pill weather"><span class="environment-main"><strong>노원구</strong> ${weatherText}</span><span class="environment-sub">${humidityText}</span>${trendHtml}</span>`,
    `<span class="environment-pill dust ${pm10Grade.className}" title="${pm10Grade.label === "좋음" ? "뛰기 좋은 공기예요." : pm10Grade.label === "보통" ? "가볍게 달리기엔 무난해요." : "강도 높은 러닝은 줄이는 게 좋아요."}"><span class="environment-main">${pm10Main}</span><span class="environment-sub">${pm10Sub}</span></span>`,
    `<span class="environment-pill dust ${pm25Grade.className}" title="${pm25Grade.label === "좋음" ? "뛰기 좋은 공기예요." : pm25Grade.label === "보통" ? "가볍게 달리기엔 무난해요." : "강도 높은 러닝은 줄이는 게 좋아요."}"><span class="environment-main">${pm25Main}</span><span class="environment-sub">${pm25Sub}</span></span>`
  ].join("");
}

function resetNowonEnvironment() {
  const widget = document.getElementById("nowonEnvironment");

  if (!widget) return;

  widget.innerHTML = '<span class="environment-pill weather"><span class="environment-main"><strong>노원구</strong> 날씨 확인 중</span><span class="environment-sub">미세먼지도 함께 확인해요</span></span>';
}

async function loadNowonEnvironment() {
  const widget = document.getElementById("nowonEnvironment");

  if (!widget) return;

  resetNowonEnvironment();

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.search = new URLSearchParams({
    latitude: String(NOWON_COORDINATES.latitude),
    longitude: String(NOWON_COORDINATES.longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    forecast_days: "2",
    timezone: "Asia/Seoul"
  }).toString();

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.search = new URLSearchParams({
    latitude: String(NOWON_COORDINATES.latitude),
    longitude: String(NOWON_COORDINATES.longitude),
    current: "pm10,pm2_5",
    timezone: "Asia/Seoul"
  }).toString();

  try {
    const [weatherResponse, airResponse] = await Promise.all([
      fetch(weatherUrl, { cache: "no-store" }),
      fetch(airUrl, { cache: "no-store" })
    ]);

    if (!weatherResponse.ok || !airResponse.ok) {
      throw new Error("Environment API response failed");
    }

    const [weatherData, airData] = await Promise.all([
      weatherResponse.json(),
      airResponse.json()
    ]);

    renderNowonEnvironment(weatherData, airData.current);
  } catch (error) {
    console.error(error);
    widget.innerHTML = '<span class="environment-pill weather bad"><span class="environment-main"><strong>노원구</strong> 정보 불러오기 실패</span><span class="environment-sub">잠시 후 다시 확인해 주세요</span></span>';
  }
}

function dateToInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatChartDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function parseInputDate(dateString) {
  if (!dateString) return null;

  const dateKey = getDateKey(dateString);
  const date = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(value) {
  if (!value) return "";

  if (value?.toDate) {
    return dateToInputValue(value.toDate());
  }

  if (value instanceof Date) {
    return dateToInputValue(value);
  }

  const stringValue = String(value).trim();
  const dateMatch = stringValue.match(/^(\d{4}-\d{2}-\d{2})/);

  if (dateMatch) return dateMatch[1];

  const parsedDate = new Date(stringValue);
  return Number.isNaN(parsedDate.getTime()) ? "" : dateToInputValue(parsedDate);
}

function getPeriodStartDate(period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    start.setDate(start.getDate() - 6);
    return start;
  }

  if (period === "month") {
    start.setDate(start.getDate() - 29);
    return start;
  }

  if (period === "year") {
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    return start;
  }

  return null;
}

function isRunInSelectedPeriod(run) {
  if (!filterPeriod || filterPeriod.value === "all") return true;

  const runDate = parseInputDate(run.runDate);
  const startDate = getPeriodStartDate(filterPeriod.value);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (!runDate || !startDate) return false;

  return runDate >= startDate && runDate <= endDate;
}

function sumMileageByPeriod(runs, period) {
  const startDate = getPeriodStartDate(period);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (!startDate) {
    return runs.reduce((total, run) => total + run.distance, 0);
  }

  return runs.reduce((total, run) => {
    const runDate = parseInputDate(run.runDate);

    if (!runDate || runDate < startDate || runDate > endDate) {
      return total;
    }

    return total + run.distance;
  }, 0);
}

function filterRunsByPeriod(runs, period) {
  const startDate = getPeriodStartDate(period);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (!startDate) return runs;

  return runs.filter((run) => {
    const runDate = parseInputDate(run.runDate);
    return runDate && runDate >= startDate && runDate <= endDate;
  });
}

function formatMileage(distance) {
  return `${Number(distance.toFixed(1))}km`;
}

function getMileageSummaryPrefix() {
  return `운동일 기준(오늘: ${getTodayDateString()})`;
}

function getCurrentMonthKey() {
  return getTodayDateString().slice(0, 7);
}

function getQualityWorkoutTypeFromPlan(planText = "") {
  if (/TT/i.test(planText)) return "tt";

  return "interval";
}

function buildQualityWorkoutDetail({ plannedWorkout, setResults, selfRating, reflection }) {
  return [
    plannedWorkout ? `계획: ${plannedWorkout}` : "",
    setResults ? `결과: ${setResults}` : "",
    selfRating ? `평가: ${selfRating}` : "",
    reflection ? `소감: ${reflection}` : ""
  ].filter(Boolean).join("\n");
}

function getOxygenCost(velocityMetersPerMinute) {
  return -4.6 + (0.182258 * velocityMetersPerMinute) + (0.000104 * velocityMetersPerMinute * velocityMetersPerMinute);
}

function getRaceMaxFraction(timeMinutes) {
  return 0.8
    + (0.1894393 * Math.exp(-0.012778 * timeMinutes))
    + (0.2989558 * Math.exp(-0.1932605 * timeMinutes));
}

function estimateVdot(timeMinutes, distanceKm) {
  if (!Number.isFinite(timeMinutes) || !Number.isFinite(distanceKm) || timeMinutes <= 0 || distanceKm <= 0) {
    return 0;
  }

  const velocity = (distanceKm * 1000) / timeMinutes;
  return getOxygenCost(velocity) / getRaceMaxFraction(timeMinutes);
}

function getRunVdotLabel(run) {
  const matchingCategory = PB_CATEGORIES.find((category) => {
    const tolerance = getDistanceCategoryTolerance(category.distance);
    return Math.abs(run.distance - category.distance) <= tolerance;
  });

  return matchingCategory ? matchingCategory.label : getDistanceLabel(run.distance);
}

function solvePaceForVdot(vdot, intensityFraction) {
  if (!Number.isFinite(vdot) || vdot <= 0) return 0;

  const targetOxygenCost = vdot * intensityFraction;
  let low = 80;
  let high = 360;

  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;

    if (getOxygenCost(mid) < targetOxygenCost) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return 1000 / ((low + high) / 2);
}

function getVdotBasis() {
  const runSources = latestRuns
    .filter((run) => run.rankingEligible !== false)
    .map((run) => ({
      label: getRunVdotLabel(run),
      distance: run.distance,
      time: run.time,
      runDate: run.runDate || "",
      vdot: estimateVdot(run.time, run.distance)
    }));

  const pbSources = PB_CATEGORIES
    .filter((category) => pb[category.key])
    .map((category) => {
      const record = pb[category.key];
      return {
        key: category.key,
        label: category.label,
        distance: category.distance,
        time: record.time,
        runDate: record.runDate || "",
        vdot: estimateVdot(record.time, category.distance)
      };
    });

  const sources = [...runSources, ...pbSources]
    .filter((source) => Number.isFinite(source.vdot) && source.vdot > 0)
    .sort((a, b) => b.vdot - a.vdot);

  return sources[0] || null;
}

function getVdotTrainingPaces() {
  const basis = getVdotBasis();

  if (!basis) return null;

  return {
    basis,
    vdot: basis.vdot,
    easy: `${formatPace(solvePaceForVdot(basis.vdot, 0.59))}~${formatPace(solvePaceForVdot(basis.vdot, 0.74))}`,
    marathon: `${formatPace(solvePaceForVdot(basis.vdot, 0.75))}~${formatPace(solvePaceForVdot(basis.vdot, 0.84))}`,
    threshold: `${formatPace(solvePaceForVdot(basis.vdot, 0.88))}~${formatPace(solvePaceForVdot(basis.vdot, 0.92))}`,
    interval: `${formatPace(solvePaceForVdot(basis.vdot, 0.97))}~${formatPace(solvePaceForVdot(basis.vdot, 1.00))}`,
    repetition: `${formatPace(solvePaceForVdot(basis.vdot, 1.04))}~${formatPace(solvePaceForVdot(basis.vdot, 1.08))}`
  };
}

function renderVdotTrainingGuide() {
  const guide = document.getElementById("vdotTrainingGuide");

  if (!guide) return;

  const paces = getVdotTrainingPaces();

  if (!paces) {
    guide.innerText = "VDOT 참고값을 계산할 기록이 아직 부족해요. 5K, 10K, 하프, 풀코스 기록이나 평소 훈련 기록을 조금 더 입력하면 개인별 훈련 페이스를 안내해드릴게요.";
    return;
  }

  guide.innerText = [
    `VDOT 참고값 ${Math.round(paces.vdot)} (${paces.basis.label} ${formatTime(paces.basis.time)}${paces.basis.runDate ? ` · ${formatChartDate(paces.basis.runDate)}` : ""} 기준)`,
    `E ${paces.easy} / M ${paces.marathon} / T ${paces.threshold} / I ${paces.interval} / R ${paces.repetition}`
  ].join("\n");
}

function getQualitySetResultsFromInputs() {
  const setValues = Array.from(document.querySelectorAll(".quality-set-input"))
    .map((input) => input.value.trim())
    .filter(Boolean);
  const memo = document.getElementById("qualitySetMemo")?.value.trim() || "";

  return [
    setValues.join(", "),
    memo
  ].filter(Boolean).join(" / ");
}

function parseFirstSetPace(setResults, plannedWorkout) {
  const setMatch = String(setResults || "").match(/(\d{1,2}):(\d{2})/);
  const distanceMatch = String(plannedWorkout || "").match(/(\d+(?:\.\d+)?)\s*(k|K|km|KM|m|M|×|x|X)/);

  if (!setMatch || !distanceMatch) return 0;

  const seconds = (Number(setMatch[1]) * 60) + Number(setMatch[2]);
  const rawDistance = Number(distanceMatch[1]);
  const unit = distanceMatch[2];
  const meters = /k/i.test(unit) ? rawDistance * 1000 : rawDistance;

  if (!seconds || !meters) return 0;

  return (seconds / 60) / (meters / 1000);
}

function getQualityVdotAssessment(run) {
  const paces = getVdotTrainingPaces();

  if (!paces) return "-";

  const qualityDisplay = getQualityDisplayData(run);
  const plannedWorkout = qualityDisplay.plannedWorkout;
  const setResults = qualityDisplay.setResults;
  const actualPace = parseFirstSetPace(setResults, plannedWorkout);

  if (!actualPace) return `I 기준 ${paces.interval}`;

  const targetPace = solvePaceForVdot(paces.vdot, /TT/i.test(plannedWorkout) ? 0.90 : 0.985);
  const diffSeconds = Math.round((actualPace - targetPace) * 60);

  if (Math.abs(diffSeconds) <= 5) {
    return `적정 (${formatPace(actualPace)}, 기준 ${formatPace(targetPace)})`;
  }

  if (diffSeconds < 0) {
    return `빠름 ${Math.abs(diffSeconds)}초/km (${formatPace(actualPace)})`;
  }

  return `여유 ${diffSeconds}초/km (${formatPace(actualPace)})`;
}

function fillQualitySetInputs(setResults = "") {
  const [setsText = "", ...memoParts] = String(setResults).split("/");
  const setValues = setsText.split(",").map((value) => value.trim()).filter(Boolean);
  const setInputs = Array.from(document.querySelectorAll(".quality-set-input"));
  const memoInput = document.getElementById("qualitySetMemo");

  setInputs.forEach((input, index) => {
    input.value = setValues[index] || "";
  });

  if (memoInput) {
    memoInput.value = memoParts.join("/").trim();
  }
}

function buildLegacyQualityRunData(runData) {
  return {
    userId: runData.userId,
    name: runData.name,
    email: runData.email,
    runDate: runData.runDate,
    distance: runData.distance,
    type: "training",
    time: runData.time,
    raceName: `[고강도] ${runData.workoutDetail || ""}`,
    raceDate: "",
    updatedAt: runData.updatedAt
  };
}

async function saveRunDocument(runId, runData) {
  if (runId) {
    await updateDoc(doc(db, "runs", runId), runData);
    return;
  }

  await addDoc(collection(db, "runs"), {
    ...runData,
    createdAt: new Date()
  });
}

function isRunInMonth(run, monthKey) {
  return Boolean(run.runDate && run.runDate.startsWith(monthKey));
}

function sumMileageByMonth(runs, monthKey) {
  return runs.reduce((total, run) => {
    if (!isRunInMonth(run, monthKey)) {
      return total;
    }

    return total + run.distance;
  }, 0);
}

function getSavedRunDate(data) {
  if (data.runDate) return data.runDate;
  if (data.raceDate) return data.raceDate;

  if (data.createdAt?.toDate) {
    return dateToInputValue(data.createdAt.toDate());
  }

  return "";
}

function resetPersonalBest() {
  pb = {
    "5K": null,
    "10K": null,
    "HALF": null,
    "FULL": null
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const updateModal = document.getElementById("updateModal");
  const closeUpdateModalBtn = document.getElementById("closeUpdateModal");
  const hideUpdateNotice = document.getElementById("hideUpdateNotice");
  const email = document.getElementById("email");
  const name = document.getElementById("name");
  const password = document.getElementById("password");
  const inviteCode = document.getElementById("inviteCode");
  const signupBtn = document.getElementById("signup");
  const loginBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logout");
  const saveBtn = document.getElementById("saveRun");
  const status = document.getElementById("status");
  const targetSelect = document.getElementById("targetTime");
  const targetBtn = document.getElementById("calcTarget");
  const runTypeSelect = document.getElementById("runType");
  const runDateInput = document.getElementById("runDate");
  const distanceSelect = document.getElementById("distanceSelect");
  const distanceInput = document.getElementById("distance");
  const raceFields = document.getElementById("raceFields");
  const raceNameInput = document.getElementById("raceName");
  const raceDateInput = document.getElementById("raceDate");
  const loadRankingBtn = document.getElementById("loadRanking");
  const rankingDistance = document.getElementById("rankingDistance");
  const rankingType = document.getElementById("rankingType");
  const monthlyGoalInput = document.getElementById("monthlyGoal");
  const saveMonthlyGoalBtn = document.getElementById("saveMonthlyGoal");
  const memberManagement = document.getElementById("memberManagement");
  const loadMembersBtn = document.getElementById("loadMembers");
  const recordPeriod = document.getElementById("recordPeriod");
  const recordType = document.getElementById("recordType");
  const recordDistance = document.getElementById("recordDistance");
  const loadMoreRunsBtn = document.getElementById("loadMoreRuns");
  const cancelRunEditBtn = document.getElementById("cancelRunEdit");
  const suggestionType = document.getElementById("suggestionType");
  const suggestionTitle = document.getElementById("suggestionTitle");
  const suggestionContent = document.getElementById("suggestionContent");
  const submitSuggestionBtn = document.getElementById("submitSuggestion");
  const authView = document.getElementById("authView");
  const appHeader = document.getElementById("appHeader");
  const dashboardView = document.getElementById("dashboardView");
  const trainingTab = document.getElementById("trainingTab");
  const qualityTab = document.getElementById("qualityTab");
  const suggestionTab = document.getElementById("suggestionTab");
  const trainingView = document.getElementById("trainingView");
  const qualityView = document.getElementById("qualityView");
  const suggestionView = document.getElementById("suggestionView");
  const qualityDateInput = document.getElementById("qualityDate");
  const qualityPlanSelect = document.getElementById("qualityPlanSelect");
  const qualityWorkoutTypeSelect = document.getElementById("qualityWorkoutType");
  const qualityPlannedWorkoutInput = document.getElementById("qualityPlannedWorkout");
  const qualityDistanceInput = document.getElementById("qualityDistance");
  const qualityHourInput = document.getElementById("qualityHour");
  const qualityMinuteInput = document.getElementById("qualityMinute");
  const qualitySecondInput = document.getElementById("qualitySecond");
  const qualitySetResultsInput = document.getElementById("qualitySetResults");
  const qualitySelfRatingSelect = document.getElementById("qualitySelfRating");
  const qualityReflectionInput = document.getElementById("qualityReflection");
  const saveQualityRunBtn = document.getElementById("saveQualityRun");
  const cancelQualityRunEditBtn = document.getElementById("cancelQualityRunEdit");
  const qualityEditStatus = document.getElementById("qualityEditStatus");
  const editGroupStandardsBtn = document.getElementById("editGroupStandards");
  const saveGroupStandardsBtn = document.getElementById("saveGroupStandards");
  const cancelGroupStandardEditBtn = document.getElementById("cancelGroupStandardEdit");

  filterDistance = document.getElementById("filterDistance");
  filterPeriod = document.getElementById("filterPeriod");
  runDateInput.value = getTodayDateString();
  qualityDateInput.value = getTodayDateString();

  function hasSeenUpdateNotice() {
    try {
      return localStorage.getItem(UPDATE_NOTICE_STORAGE_KEY) === "seen";
    } catch (error) {
      return false;
    }
  }

  function rememberUpdateNotice() {
    try {
      localStorage.setItem(UPDATE_NOTICE_STORAGE_KEY, "seen");
    } catch (error) {
      // Storage can be unavailable in private or restricted browser modes.
    }
  }

  function showUpdateNotice() {
    if (!updateModal || hasSeenUpdateNotice()) return;

    updateModal.classList.remove("hidden");
    closeUpdateModalBtn?.focus();
  }

  function closeUpdateNotice() {
    if (!updateModal) return;

    updateModal.classList.add("hidden");

    if (hideUpdateNotice?.checked) {
      rememberUpdateNotice();
    }
  }

  closeUpdateModalBtn?.addEventListener("click", closeUpdateNotice);
  updateModal?.addEventListener("click", (event) => {
    if (event.target === updateModal) closeUpdateNotice();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !updateModal?.classList.contains("hidden")) {
      closeUpdateNotice();
    }
  });
  showUpdateNotice();

  function setAuthenticatedView(isLoggedIn) {
    document.body.classList.toggle("is-authenticated", isLoggedIn);
    authView.classList.toggle("hidden", isLoggedIn);
    appHeader.classList.toggle("hidden", !isLoggedIn);
    dashboardView.classList.toggle("hidden", !isLoggedIn);
    authView.style.display = isLoggedIn ? "none" : "";
    appHeader.style.display = isLoggedIn ? "flex" : "none";
    dashboardView.style.display = isLoggedIn ? "block" : "none";
  }

  function updateHostView(user) {
    const isHost = isHostUser(user);
    memberManagement.classList.toggle("hidden", !isHost);

    if (!isHost) {
      document.getElementById("memberList").innerHTML = "";
      clearMemberRunsPanel();
    }
  }

  function setActiveAppView(viewName) {
    const showsQuality = viewName === "quality";
    const showsSuggestion = viewName === "suggestion";

    trainingView.classList.toggle("hidden", showsQuality || showsSuggestion);
    qualityView.classList.toggle("hidden", !showsQuality);
    suggestionView.classList.toggle("hidden", !showsSuggestion);
    trainingTab.classList.toggle("active", viewName === "training");
    qualityTab.classList.toggle("active", showsQuality);
    suggestionTab.classList.toggle("active", showsSuggestion);

    if (showsQuality) {
      renderVdotTrainingGuide();
      renderQualityMonthlyPlan();
      renderQualityRuns();
    }

    if (showsSuggestion) {
      loadSuggestions(auth.currentUser);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateRaceFields() {
    const isRace = runTypeSelect.value === "race";

    raceFields.classList.toggle("hidden", !isRace);
    raceNameInput.disabled = !isRace;
    raceDateInput.disabled = !isRace;

    if (isRace && !raceDateInput.value) {
      raceDateInput.value = runDateInput.value;
    }

    if (!isRace) {
      raceNameInput.value = "";
      raceDateInput.value = "";
    }
  }

  function updateDistanceInput() {
    const usesPresetDistance = Boolean(distanceSelect.value);

    distanceInput.disabled = usesPresetDistance;
    distanceInput.value = usesPresetDistance ? "" : distanceInput.value;
    distanceInput.placeholder = usesPresetDistance ? "선택 거리 사용" : "km";
  }

  runTypeSelect.addEventListener("change", updateRaceFields);
  distanceSelect.addEventListener("change", updateDistanceInput);
  editGroupStandardsBtn.addEventListener("click", () => {
    renderRunningGroupStandards(auth.currentUser, true);
  });
  cancelGroupStandardEditBtn.addEventListener("click", () => {
    renderRunningGroupStandards(auth.currentUser, false);
  });
  saveGroupStandardsBtn.addEventListener("click", () => {
    saveRunningGroupStandards();
  });
  qualityPlanSelect.addEventListener("change", () => {
    const selected = qualityPlanSelect.selectedOptions[0];

    if (!selected || !selected.value) return;

    qualityPlannedWorkoutInput.value = selected.dataset.workout || "";
    qualityWorkoutTypeSelect.value = selected.dataset.type || "interval";
  });
  trainingTab.addEventListener("click", () => {
    setActiveAppView("training");
  });
  qualityTab.addEventListener("click", () => {
    setActiveAppView("quality");
  });
  suggestionTab.addEventListener("click", () => {
    setActiveAppView("suggestion");
  });
  runDateInput.addEventListener("change", () => {
    if (runTypeSelect.value === "race" && !raceDateInput.value) {
      raceDateInput.value = runDateInput.value;
    }
  });
  updateRaceFields();
  updateDistanceInput();

  for (let min = 180; min <= 300; min += 10) {
    const option = document.createElement("option");
    const hours = Math.floor(min / 60);
    const minutes = min % 60;

    option.value = min;
    option.textContent = `${hours}시간 ${minutes.toString().padStart(2, "0")}분 이내`;

    if (min === 240) option.selected = true;

    targetSelect.appendChild(option);
  }

  targetBtn.addEventListener("click", () => {
    const targetTime = Number(targetSelect.value);
    const required5K = reverseRiegel(targetTime, 5);
    const required10K = reverseRiegel(targetTime, 10);
    const requiredHalf = reverseRiegel(targetTime, 21.097);
    const resultDiv = document.getElementById("targetResult");
    const trainingPlan = generateTrainingPlan(pb, targetTime, required10K, requiredHalf);
    const trainingMsg = recommendTraining(pb, targetTime, required10K, requiredHalf);
    const goalProbability = analyzeGoalProbability(targetTime);

    resultDiv.classList.remove("hidden");
    resultDiv.innerHTML = `
      <div class="target-block target-analysis">
        <div class="target-block-title">목표 분석</div><br>
        ${createTargetAnalysisHtml(targetTime, required5K, required10K, requiredHalf)}
      </div>
      <div class="target-block target-probability">
        <div class="target-block-title">목표 달성 확률</div><br>
        ${goalProbability.replace(/\n/g, "<br>")}
      </div>
      <div class="target-block target-plan">
        <div class="target-block-title">주간 훈련 계획</div><br>
        <span class="target-metric">주간 마일리지: ${trainingPlan.weeklyMileage}km</span><br>
        ${trainingPlan.lines.join("<br>")}
      </div>
      <div class="target-block target-comment">
        <div class="target-block-title">페이서 코멘트</div><br>
        ${trainingMsg.replace(/\n/g, "<br>")}
      </div>
    `;
  });

  targetSelect.addEventListener("change", () => {
    const resultDiv = document.getElementById("targetResult");

    resultDiv.classList.add("hidden");
    resultDiv.innerHTML = "";
  });

  signupBtn.addEventListener("click", async () => {
    signupInProgress = true;

    try {
      const displayName = name.value.trim();

      if (!displayName) {
        signupInProgress = false;
        alert("이름을 입력해주세요.");
        return;
      }

      if (inviteCode.value.trim().toUpperCase() !== CLUB_INVITE_CODE) {
        signupInProgress = false;
        alert("클럽 가입코드를 확인해주세요.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
      await updateProfile(userCredential.user, {
        displayName
      });
      await createPendingUserProfile(userCredential.user, displayName);
      status.innerText = "승인 대기 상태";
      setAuthenticatedView(false);
      alert("가입 신청이 완료되었습니다. 관리자가 승인한 뒤 로그인할 수 있습니다.\n앱관리자 문의: 페이서(01071557374)");
      await signOut(auth);
    } catch (e) {
      alert(getAuthErrorMessage(e, "signup"));
    } finally {
      signupInProgress = false;
    }
  });

  loginBtn.addEventListener("click", async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
      const profile = await ensureUserProfile(userCredential.user);

      if (!profile && !isHostUser(userCredential.user)) {
        alert("회원 프로필을 찾지 못했습니다. 앱관리자에게 문의해주세요.\n앱관리자 문의: 페이서(01071557374)");
        await signOut(auth);
        return;
      }

      if (profile?.disabled && !isHostUser(userCredential.user)) {
        alert("이용이 정지된 회원입니다. 호스트에게 문의해주세요.");
        await signOut(auth);
        return;
      }

      if (!isApprovedProfile(userCredential.user, profile)) {
        alert("가입 승인 대기 중입니다. 관리자가 승인한 뒤 이용할 수 있습니다.\n앱관리자 문의: 페이서(01071557374)");
        await signOut(auth);
        return;
      }

      status.innerText = getLoginStatusText(userCredential.user, profile);
      setAuthenticatedView(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      alert(getAuthErrorMessage(e, "login"));
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    alert("로그아웃되었습니다.");
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (signupInProgress) return;

      setAuthenticatedView(true);
      updateHostView(user);
      loadNowonEnvironment();
      password.value = "";
      inviteCode.value = "";

      try {
        const profile = await ensureUserProfile(user);

        if (!profile && !isHostUser(user)) {
          status.innerText = "회원 프로필 확인 필요";
          alert("회원 프로필을 찾지 못했습니다. 앱관리자에게 문의해주세요.\n앱관리자 문의: 페이서(01071557374)");
          await signOut(auth);
          return;
        }

        status.innerText = getLoginStatusText(user, profile);

        if (profile?.disabled && !isHostUser(user)) {
          alert("이용이 정지된 회원입니다. 호스트에게 문의해주세요.");
          await signOut(auth);
          return;
        }

        if (!isApprovedProfile(user, profile)) {
          status.innerText = "승인 대기 상태";
          alert("가입 승인 대기 중입니다. 관리자가 승인한 뒤 이용할 수 있습니다.\n앱관리자 문의: 페이서(01071557374)");
          await signOut(auth);
          return;
        }

        try {
          setActiveAppView("training");
          await loadMonthlyGoal(user);
          await loadMyRuns(user);
          await loadRunningGroupStandards(user);
        } catch (e) {
          showDashboardLoadError(e);
        }

        await loadClubRanking(user);
        await loadWeeklyRanking(user);
        await loadSuggestions(user);

      } catch (e) {
        showDashboardLoadError(e);
      }
    } else {
      status.innerText = "로그아웃 상태";
      setActiveAppView("training");
      setAuthenticatedView(false);
      updateHostView(null);
      resetNowonEnvironment();
      clearDashboard();
    }
  });

  saveBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("로그인 후 기록을 저장할 수 있습니다.");
      return;
    }

    const runType = runTypeSelect.value;
    const runDate = runDateInput.value;
    const raceName = raceNameInput.value.trim();
    const raceDate = raceDateInput.value || runDate;
    const manualDistance = distanceInput.value;
    const distance = Number(distanceSelect.value || manualDistance);
    const hour = Number(document.getElementById("hour").value) || 0;
    const minute = Number(document.getElementById("minute").value) || 0;
    const second = Number(document.getElementById("second").value) || 0;
    const time = hour * 60 + minute + (second / 60);

    if (!distance || !time) {
      alert("거리와 시간을 입력해주세요.");
      return;
    }

    if (!runDate) {
      alert("운동일을 입력해주세요.");
      return;
    }

    const validationMessage = validateRunInput(distance, time);

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    if (runType === "race" && !raceName) {
      alert("대회명을 입력해주세요.");
      return;
    }

    try {
      const runOwner = editingRun
        ? {
            userId: editingRun.userId,
            name: editingRun.name || selectedAdminMember?.name || getUserName(user),
            email: editingRun.email || selectedAdminMember?.email || user.email
          }
        : {
            userId: user.uid,
            name: getUserName(user),
            email: user.email
          };
      const runData = {
        userId: runOwner.userId,
        name: runOwner.name,
        email: runOwner.email,
        runDate,
        distance,
        type: runType,
        workoutType: runType === "race" ? "" : isQualityWorkout(editingRun || {}) ? editingRun.workoutType : "steady",
        workoutDetail: runType === "race" ? "" : isQualityWorkout(editingRun || {}) ? editingRun.workoutDetail || "" : "",
        rankingEligible: runType === "race" ? true : isQualityWorkout(editingRun || {}) ? editingRun.rankingEligible !== false : true,
        time,
        updatedAt: new Date()
      };

      if (runType === "race") {
        runData.raceName = raceName;
        runData.raceDate = raceDate;
      } else {
        runData.raceName = "";
        runData.raceDate = "";
      }

      if (editingRun) {
        await updateDoc(doc(db, "runs", editingRun.id), runData);
      } else {
        await addDoc(collection(db, "runs"), {
          ...runData,
          createdAt: new Date()
        });
      }

      const wasEditing = Boolean(editingRun);
      const wasEditingAdminRun = editingRun && editingRun.userId !== user.uid;
      resetRunForm();
      alert(wasEditing ? "기록을 수정했습니다." : "기록을 저장했습니다.");
      await loadMyRuns(user);
      await loadClubRanking(user);
      await loadWeeklyRanking(user);
      if (wasEditingAdminRun && selectedAdminMember) {
        await loadMemberRuns(selectedAdminMember);
      }
    } catch (e) {
      console.error(e);
      alert(editingRun ? "기록 수정에 실패했습니다. Firestore 권한을 확인해주세요." : "기록 저장에 실패했습니다.");
    }
  });

  saveQualityRunBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("로그인 후 정훈 결과를 저장할 수 있습니다.");
      return;
    }

    const runDate = qualityDateInput.value;
    const workoutType = qualityWorkoutTypeSelect.value;
    const distance = Number(qualityDistanceInput.value);
    const hour = Number(qualityHourInput.value) || 0;
    const minute = Number(qualityMinuteInput.value) || 0;
    const second = Number(qualitySecondInput.value) || 0;
    const time = hour * 60 + minute + (second / 60);
    const qualityPlanDate = qualityPlanSelect.value;
    const plannedWorkout = qualityPlannedWorkoutInput.value.trim();
    const setResults = getQualitySetResultsFromInputs();
    qualitySetResultsInput.value = setResults;
    const selfRating = qualitySelfRatingSelect.value;
    const reflection = qualityReflectionInput.value.trim();
    const workoutDetail = buildQualityWorkoutDetail({
      plannedWorkout,
      setResults,
      selfRating,
      reflection
    });

    if (!runDate) {
      alert("운동일을 입력해주세요.");
      return;
    }

    if (!distance || !time) {
      alert("총 거리와 시간을 입력해주세요.");
      return;
    }

    const validationMessage = validateRunInput(distance, time);

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    if (!plannedWorkout) {
      alert("훈련 계획을 선택하거나 입력해주세요.");
      return;
    }

    if (!setResults) {
      alert("세트별 결과를 입력해주세요.");
      return;
    }

    if (!selfRating || !reflection) {
      alert("훈련 평가와 소감을 입력해주세요.");
      return;
    }

    saveQualityRunBtn.disabled = true;

    try {
      const runOwner = editingQualityRun
        ? {
            userId: editingQualityRun.userId,
            name: editingQualityRun.name || getUserName(user),
            email: editingQualityRun.email || user.email
          }
        : {
            userId: user.uid,
            name: getUserName(user),
            email: user.email
          };
      const runData = {
        userId: runOwner.userId,
        name: runOwner.name,
        email: runOwner.email,
        runDate,
        distance,
        type: "training",
        workoutType,
        workoutDetail,
        qualityPlanDate,
        qualityPlannedWorkout: plannedWorkout,
        qualitySetResults: setResults,
        qualitySelfRating: selfRating,
        qualityReflection: reflection,
        rankingEligible: false,
        time,
        updatedAt: new Date()
      };

      try {
        await saveRunDocument(editingQualityRun?.id, runData);
      } catch (e) {
        if (e.code !== "permission-denied") {
          throw e;
        }

        await saveRunDocument(editingQualityRun?.id, buildLegacyQualityRunData(runData));
      }

      const wasEditing = Boolean(editingQualityRun);
      resetQualityForm();
      await loadMyRuns(user);
      await loadWeeklyRanking(user);
      renderQualityRuns();
      alert(wasEditing ? "정훈 결과를 수정했습니다." : "정훈 결과를 저장했습니다.");
    } catch (e) {
      console.error(e);
      alert(editingQualityRun ? "정훈 결과 수정에 실패했습니다. Firestore 권한을 확인해주세요." : "정훈 결과 저장에 실패했습니다. Firestore 권한을 확인해주세요.");
    } finally {
      saveQualityRunBtn.disabled = false;
    }
  });

  cancelRunEditBtn.addEventListener("click", () => {
    resetRunForm();
  });

  cancelQualityRunEditBtn.addEventListener("click", () => {
    resetQualityForm();
  });

  filterDistance.addEventListener("change", () => {
    drawChart(latestRuns);
  });

  filterPeriod.addEventListener("change", () => {
    drawChart(latestRuns);
  });

  [recordPeriod, recordType, recordDistance].forEach((filter) => {
    filter.addEventListener("change", () => {
      visibleRunCount = INITIAL_VISIBLE_RUN_COUNT;
      renderRunList();
    });
  });

  loadMoreRunsBtn.addEventListener("click", () => {
    visibleRunCount += RUN_LOAD_MORE_COUNT;
    renderRunList();
  });

  submitSuggestionBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("로그인 후 제안을 전송할 수 있습니다.");
      return;
    }

    const type = suggestionType.value;
    const title = suggestionTitle.value.trim();
    const content = suggestionContent.value.trim();

    if (!title) {
      alert("제안 제목을 입력해주세요.");
      return;
    }

    if (!content) {
      alert("제안 내용을 입력해주세요.");
      return;
    }

    submitSuggestionBtn.disabled = true;

    try {
      await addDoc(collection(db, "suggestions"), {
        type,
        title,
        content,
        userId: user.uid,
        name: getUserName(user),
        email: user.email,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      suggestionType.value = "error";
      suggestionTitle.value = "";
      suggestionContent.value = "";
      await loadSuggestions(user);
      alert("제안을 전송했습니다.");
    } catch (e) {
      console.error(e);
      alert("제안 전송에 실패했습니다. Firestore 권한을 확인해주세요.");
    } finally {
      submitSuggestionBtn.disabled = false;
    }
  });

  loadRankingBtn.addEventListener("click", () => {
    loadClubRanking(auth.currentUser);
  });

  rankingDistance.addEventListener("change", () => {
    loadClubRanking(auth.currentUser);
  });

  rankingType.addEventListener("change", () => {
    loadClubRanking(auth.currentUser);
  });

  saveMonthlyGoalBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    const goal = Number(monthlyGoalInput.value);

    if (!user) {
      alert("로그인 후 월 목표를 저장할 수 있습니다.");
      return;
    }

    if (monthlyGoalLocked) {
      alert("월 마일리지 목표는 월 1회만 설정할 수 있습니다.");
      return;
    }

    if (!Number.isFinite(goal) || goal <= 0) {
      alert("월 마일리지 목표를 0보다 큰 숫자로 입력해주세요.");
      return;
    }

    try {
      await saveMonthlyGoal(user, goal);
      updateMonthlyGoalStatus(latestRuns);
      updateEngagementPanels(latestRuns);
      alert("월 마일리지 목표를 저장했습니다.");
    } catch (e) {
      console.error(e);
      alert("월 마일리지 목표 저장에 실패했습니다.");
    }
  });

  loadMembersBtn.addEventListener("click", () => {
    loadMembers();
  });
});

async function loadMyRuns(user) {
  const runs = [];

  resetPersonalBest();

  const q = query(
    collection(db, "runs"),
    where("userId", "==", user.uid)
  );

  const querySnapshot = await getDocsFromServer(q);

  querySnapshot.forEach((snapshotDoc) => {
    const data = snapshotDoc.data();
    const distance = Number(data.distance);
    const time = Number(data.time);
    const runDate = getSavedRunDate(data);
  const run = {
      id: snapshotDoc.id,
      distance,
      time,
      runDate,
      type: data.type || "training",
      workoutType: data.workoutType || (data.type === "training" && String(data.raceName || "").startsWith("[고강도]") ? "other" : "steady"),
      workoutDetail: data.workoutDetail || (data.type === "training" && String(data.raceName || "").startsWith("[고강도]") ? String(data.raceName).replace(/^\[고강도\]\s*/, "") : ""),
      qualityPlanDate: data.qualityPlanDate || "",
      qualityPlannedWorkout: data.qualityPlannedWorkout || "",
      qualitySetResults: data.qualitySetResults || "",
      qualitySelfRating: data.qualitySelfRating || "",
      qualityReflection: data.qualityReflection || "",
      rankingEligible: data.rankingEligible !== false,
      raceName: data.raceName || "",
      raceDate: data.raceDate || "",
      userId: data.userId || user.uid,
      name: data.name || getUserName(user),
      email: data.email || user.email
    };

    runs.push(run);
    if (run.rankingEligible !== false) {
      updatePersonalBest(distance, time, run);
    }
  });

  runs.sort((a, b) => (b.runDate || "").localeCompare(a.runDate || ""));

  latestRuns = runs;
  visibleRunCount = INITIAL_VISIBLE_RUN_COUNT;
  updateMileageSummary(runs);
  updateMonthlyGoalStatus(runs);
  updatePeriodStats(runs);
  updateEngagementPanels(runs);
  renderRunList();
  renderQualityRuns();
  renderVdotTrainingGuide();
  updatePersonalBestView();
  updateMarathonPrediction();
  drawChart(runs);
}

function getRecordPeriodStart(period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "month") {
    start.setDate(start.getDate() - 29);
    return start;
  }

  if (period === "quarter") {
    start.setMonth(start.getMonth() - 3);
    start.setDate(start.getDate() + 1);
    return start;
  }

  if (period === "year") {
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    return start;
  }

  return null;
}

function getFilteredRunRecords() {
  const recordPeriod = document.getElementById("recordPeriod");
  const recordType = document.getElementById("recordType");
  const recordDistance = document.getElementById("recordDistance");
  const startDate = getRecordPeriodStart(recordPeriod?.value || "all");
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  return latestRuns.filter((run) => {
    if (recordType?.value !== "all" && run.type !== recordType.value) {
      return false;
    }

    if (recordDistance?.value !== "all" && !isSameDistanceCategory(run.distance, Number(recordDistance.value))) {
      return false;
    }

    if (startDate) {
      const runDate = parseInputDate(run.runDate);

      if (!runDate || runDate < startDate || runDate > endDate) {
        return false;
      }
    }

    return true;
  });
}

function renderRunList() {
  const runList = document.getElementById("runList");
  const recordListStatus = document.getElementById("recordListStatus");
  const loadMoreRunsBtn = document.getElementById("loadMoreRuns");

  if (!runList || !recordListStatus || !loadMoreRunsBtn) return;

  const filteredRuns = getFilteredRunRecords();
  const visibleRuns = filteredRuns.slice(0, visibleRunCount);

  runList.innerHTML = "";

  visibleRuns.forEach((run) => {
    const runType = run.type === "race" ? "대회" : "훈련";
    const pace = run.time / run.distance;
    const tr = document.createElement("tr");
    const cells = [
      run.runDate || "-",
      runType,
      `${run.distance}km`,
      formatTime(run.time),
      formatPace(pace),
      getRunDetailDisplay(run)
    ];

    cells.forEach((value) => {
      const td = document.createElement("td");
      td.innerText = value;
      tr.appendChild(td);
    });

    const actionTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "table-action";
    editBtn.innerText = "수정";
    editBtn.addEventListener("click", () => {
      if (isQualityWorkout(run)) {
        beginQualityRunEdit(run);
        return;
      }

      document.getElementById("trainingTab")?.click();
      beginRunEdit(run);
    });
    actionTd.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "button-danger table-action";
    deleteBtn.innerText = "삭제";
    deleteBtn.addEventListener("click", () => {
      deleteRun(run);
    });
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    runList.appendChild(tr);
  });

  if (filteredRuns.length === 0) {
    recordListStatus.innerText = "조건에 맞는 운동 기록이 없습니다.";
  } else {
    recordListStatus.innerText = `${Math.min(visibleRunCount, filteredRuns.length)}개 표시 중 / 전체 ${filteredRuns.length}개`;
  }

  loadMoreRunsBtn.classList.toggle("hidden", visibleRunCount >= filteredRuns.length);
}

function isQualityWorkout(run) {
  return ["interval", "repetition", "build-up", "tt", "tempo", "other"].includes(run.workoutType);
}

function resetQualityForm() {
  const qualityDateInput = document.getElementById("qualityDate");
  const qualityPlanSelect = document.getElementById("qualityPlanSelect");
  const qualityWorkoutTypeSelect = document.getElementById("qualityWorkoutType");
  const qualityPlannedWorkoutInput = document.getElementById("qualityPlannedWorkout");
  const qualityDistanceInput = document.getElementById("qualityDistance");
  const qualityHourInput = document.getElementById("qualityHour");
  const qualityMinuteInput = document.getElementById("qualityMinute");
  const qualitySecondInput = document.getElementById("qualitySecond");
  const qualitySetResultsInput = document.getElementById("qualitySetResults");
  const qualitySelfRatingSelect = document.getElementById("qualitySelfRating");
  const qualityReflectionInput = document.getElementById("qualityReflection");

  if (!qualityDateInput) return;

  editingQualityRun = null;
  qualityDateInput.value = getTodayDateString();
  qualityPlanSelect.value = "";
  qualityWorkoutTypeSelect.value = "interval";
  qualityPlannedWorkoutInput.value = "";
  qualityDistanceInput.value = "";
  qualityHourInput.value = "";
  qualityMinuteInput.value = "";
  qualitySecondInput.value = "";
  qualitySetResultsInput.value = "";
  fillQualitySetInputs("");
  qualitySelfRatingSelect.value = "";
  qualityReflectionInput.value = "";
  updateQualityFormMode();
}

function renderQualityRuns() {
  const qualityStatus = document.getElementById("qualityStatus");
  const qualityRunList = document.getElementById("qualityRunList");

  if (!qualityStatus || !qualityRunList) return;

  qualityRunList.innerHTML = "";

  const qualityRuns = latestRuns
    .filter((run) => run.type === "training" && isQualityWorkout(run))
    .sort((a, b) => (b.runDate || "").localeCompare(a.runDate || ""));

  if (!auth.currentUser) {
    qualityStatus.innerText = "로그인 후 정훈 결과를 확인할 수 있습니다.";
    return;
  }

  if (!qualityRuns.length) {
    qualityStatus.innerText = "아직 저장된 정훈 결과가 없습니다.";
    return;
  }

  qualityStatus.innerText = `${qualityRuns.length}개 정훈 결과`;

  qualityRuns.forEach((run) => {
    const pace = run.time / run.distance;
    const qualityDisplay = getQualityDisplayData(run);
    const tr = document.createElement("tr");
    const cells = [
      { value: run.runDate || "-", className: "quality-date-cell" },
      { value: getWorkoutTypeLabel(run.workoutType), className: "quality-type-cell" },
      { value: `${run.distance}km`, className: "quality-number-cell" },
      { value: formatTime(run.time), className: "quality-number-cell" },
      { value: formatPace(pace), className: "quality-number-cell" },
      { value: qualityDisplay.plannedWorkout, className: "quality-text-cell" },
      { value: getQualityVdotAssessment(run), className: "quality-vdot-cell" },
      { value: qualityDisplay.selfRating, className: "quality-rating-cell" },
      { value: qualityDisplay.reflection, className: "quality-text-cell" }
    ];

    cells.forEach(({ value, className }) => {
      const td = document.createElement("td");
      td.className = className;
      td.innerText = value;
      tr.appendChild(td);
    });

    const actionTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "table-action";
    editBtn.innerText = "수정";
    editBtn.addEventListener("click", () => {
      beginQualityRunEdit(run);
    });
    actionTd.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "button-danger table-action";
    deleteBtn.innerText = "삭제";
    deleteBtn.addEventListener("click", () => {
      deleteRun(run);
    });
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    qualityRunList.appendChild(tr);
  });
}

function renderQualityMonthlyPlan() {
  const qualityMonthlyPlan = document.getElementById("qualityMonthlyPlan");
  const qualityPlanSelect = document.getElementById("qualityPlanSelect");
  const upcomingWorkout = getUpcomingQualityWorkout();
  const userGroup = getCurrentUserRunningGroup(getMarathonPredictionBasis()?.predictedTime);

  if (!qualityMonthlyPlan) return;

  qualityMonthlyPlan.innerHTML = "";
  if (qualityPlanSelect) {
    qualityPlanSelect.innerHTML = '<option value="">직접 입력</option>';
  }

  const currentMonth = new Date().getMonth() + 1;
  const schedule = QUALITY_MONTHLY_SCHEDULE[currentMonth];

  if (!schedule) {
    const empty = document.createElement("article");
    empty.className = "quality-plan-item";
    empty.innerHTML = [
      '<div class="quality-plan-title">화요 정훈 월간 스케줄</div>',
      '<div>4월부터 10월까지의 정훈 계획 운영 기간이 아닙니다.</div>',
      '<div class="quality-plan-meta">다음 시즌 계획이 확정되면 업데이트됩니다.</div>'
    ].join("");
    qualityMonthlyPlan.appendChild(empty);
    return;
  }

  const summary = document.createElement("article");
  summary.className = "quality-plan-item";
  summary.innerHTML = [
    `<div class="quality-plan-title">${schedule.title}</div>`,
    `<div>월별 목적: ${schedule.purpose}</div>`,
    upcomingWorkout ? `<div>다가오는 정훈: ${upcomingWorkout.date} ${upcomingWorkout.text}</div>` : "",
    upcomingWorkout && userGroup ? `<div class="quality-plan-meta">${userGroup.group}조 인터벌 페이스 ${userGroup.intervalPace} / 리커버리 ${userGroup.recoveryPace}</div>` : "",
    upcomingWorkout && !userGroup ? '<div class="quality-plan-meta">조별 기준표에서 내 조 페이스를 확인해 주세요.</div>' : "",
    schedule.note ? `<div class="quality-plan-meta">${schedule.note}</div>` : ""
  ].filter(Boolean).join("");
  qualityMonthlyPlan.appendChild(summary);

  const selectedDetail = document.createElement("article");
  selectedDetail.className = "quality-plan-item quality-plan-selected";

  const renderSelectedWorkout = (workout) => {
    selectedDetail.innerHTML = [
      `<div class="quality-plan-title">${workout.date} ${workout.text}</div>`,
      userGroup
        ? `<div>${userGroup.group}조 기준: 인터벌 ${userGroup.intervalPace} / 리커버리 ${userGroup.recoveryPace}</div>`
        : '<div>조별 기준표에서 내 조 페이스를 확인해 주세요.</div>',
      userGroup?.source === "prediction" ? '<div class="quality-plan-meta">조별 명단에 이름이 없어 최근 기록 기반 예상 조로 안내합니다.</div>' : "",
      '<div class="quality-plan-meta">날짜를 누르면 이 프로그램이 정훈 결과 입력에도 자동으로 들어갑니다.</div>'
    ].filter(Boolean).join("");
  };

  renderSelectedWorkout(upcomingWorkout || schedule.workouts[0]);

  const planList = document.createElement("div");
  planList.className = "quality-plan-list";

  schedule.workouts.forEach((workout) => {
    if (qualityPlanSelect) {
      const option = document.createElement("option");
      option.value = workout.date;
      option.dataset.workout = workout.text;
      option.dataset.type = getQualityWorkoutTypeFromPlan(workout.text);
      option.innerText = `${workout.date} ${workout.text}`;
      qualityPlanSelect.appendChild(option);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "quality-plan-date";
    button.innerHTML = [
      `<span class="quality-plan-date-day">${workout.date}</span>`,
      `<span class="quality-plan-date-text">${workout.text}</span>`
    ].join("");
    button.addEventListener("click", () => {
      planList.querySelectorAll(".quality-plan-date").forEach((planButton) => {
        planButton.classList.toggle("active", planButton === button);
      });
      renderSelectedWorkout(workout);

      if (qualityPlanSelect) {
        qualityPlanSelect.value = workout.date;
        qualityPlanSelect.dispatchEvent(new Event("change"));
      }
    });

    if (upcomingWorkout && workout.date === upcomingWorkout.date) {
      button.classList.add("active");
    }

    planList.appendChild(button);
  });

  qualityMonthlyPlan.appendChild(planList);
  qualityMonthlyPlan.appendChild(selectedDetail);
}

function parseQualityWorkoutDate(workoutDate, year = new Date().getFullYear()) {
  const match = String(workoutDate || "").match(/^(\d{1,2})\/(\d{1,2})$/);

  if (!match) return null;

  return new Date(year, Number(match[1]) - 1, Number(match[2]));
}

function getUpcomingQualityWorkout(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  const today = new Date(currentYear, referenceDate.getMonth(), referenceDate.getDate());
  const workouts = Object.values(QUALITY_MONTHLY_SCHEDULE)
    .flatMap((schedule) => schedule.workouts)
    .map((workout) => ({
      ...workout,
      sortDate: parseQualityWorkoutDate(workout.date, currentYear)
    }))
    .filter((workout) => workout.sortDate && workout.sortDate >= today)
    .sort((a, b) => a.sortDate - b.sortDate);

  return workouts[0] || null;
}

function normalizeMemberName(name) {
  return String(name || "").replace(/\s+/g, "").trim();
}

function getRunningGroupByMemberName(memberName) {
  const normalizedName = normalizeMemberName(memberName);

  if (!normalizedName) return null;

  return runningGroupStandards.find((standard) => {
    return String(standard.members || "")
      .split(/[,，]/)
      .map(normalizeMemberName)
      .includes(normalizedName);
  }) || null;
}

function getCurrentUserRunningGroup(fallbackPredictedTime = null) {
  const user = auth.currentUser;
  const memberGroup = getRunningGroupByMemberName(getUserName(user));

  if (memberGroup) {
    return { ...memberGroup, source: "member" };
  }

  if (fallbackPredictedTime) {
    const predictedGroup = getRunningGroup(fallbackPredictedTime);
    return predictedGroup ? { ...predictedGroup, source: "prediction" } : null;
  }

  return null;
}

function getOfficialTrainingPlanText(fallbackPredictedTime = null) {
  const workout = getUpcomingQualityWorkout();
  const group = getCurrentUserRunningGroup(fallbackPredictedTime);
  const workoutText = workout ? workout.text : "화요 정훈 탭의 앞으로의 계획 확인";

  if (group) {
    return `${OFFICIAL_TRAINING_LABEL}: ${workoutText} (${group.group}조 인터벌 ${group.intervalPace})`;
  }

  return `${OFFICIAL_TRAINING_LABEL}: ${workoutText}`;
}

function getOfficialTrainingCommentText(fallbackPredictedTime = null) {
  const workout = getUpcomingQualityWorkout();
  const group = getCurrentUserRunningGroup(fallbackPredictedTime);
  const workoutText = workout ? `${workout.date} ${workout.text}` : "화요 정훈 탭의 다음 정훈";
  const paceText = group ? ` ${group.group}조 기준 ${group.intervalPace}를 참고하세요.` : "";

  return `이번 주 화요일 ${OFFICIAL_TRAINING_LABEL}은 ${workoutText}입니다.${paceText}`;
}

function readZipUint16(view, offset) {
  return view.getUint16(offset, true);
}

function readZipUint32(view, offset) {
  return view.getUint32(offset, true);
}

function getZipTextDecoder() {
  try {
    return new TextDecoder("utf-8");
  } catch (e) {
    return new TextDecoder();
  }
}

function findZipEndOfCentralDirectory(view) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, view.byteLength - 65557);

  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (readZipUint32(view, offset) === signature) {
      return offset;
    }
  }

  throw new Error("XLSX ZIP directory not found.");
}

async function inflateZipEntry(bytes) {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser cannot decompress XLSX files.");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractZipEntries(buffer, wantedPaths) {
  const view = new DataView(buffer);
  const decoder = getZipTextDecoder();
  const wanted = new Set(wantedPaths);
  const files = new Map();
  const eocdOffset = findZipEndOfCentralDirectory(view);
  const entryCount = readZipUint16(view, eocdOffset + 10);
  let offset = readZipUint32(view, eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (readZipUint32(view, offset) !== 0x02014b50) {
      throw new Error("Invalid XLSX ZIP directory.");
    }

    const method = readZipUint16(view, offset + 10);
    const compressedSize = readZipUint32(view, offset + 20);
    const fileNameLength = readZipUint16(view, offset + 28);
    const extraLength = readZipUint16(view, offset + 30);
    const commentLength = readZipUint16(view, offset + 32);
    const localHeaderOffset = readZipUint32(view, offset + 42);
    const fileNameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const fileName = decoder.decode(fileNameBytes);

    if (wanted.has(fileName)) {
      if (readZipUint32(view, localHeaderOffset) !== 0x04034b50) {
        throw new Error(`Invalid XLSX ZIP entry: ${fileName}`);
      }

      const localNameLength = readZipUint16(view, localHeaderOffset + 26);
      const localExtraLength = readZipUint16(view, localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressedBytes = new Uint8Array(buffer, dataOffset, compressedSize);
      const bytes = method === 0 ? compressedBytes : await inflateZipEntry(compressedBytes);
      files.set(fileName, decoder.decode(bytes));
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return files;
}

function getSpreadsheetText(node) {
  if (!node) return "";

  return Array.from(node.getElementsByTagNameNS("*", "t"))
    .map((textNode) => textNode.textContent || "")
    .join("");
}

function getSpreadsheetCellIndex(reference) {
  const letters = String(reference || "").match(/^[A-Z]+/i)?.[0] || "";

  return letters
    .toUpperCase()
    .split("")
    .reduce((total, letter) => (total * 26) + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseSharedStrings(sharedStringsXml) {
  if (!sharedStringsXml) return [];

  const documentXml = new DOMParser().parseFromString(sharedStringsXml, "application/xml");
  return Array.from(documentXml.getElementsByTagNameNS("*", "si")).map(getSpreadsheetText);
}

function parseRunningGroupStandardsSheet(sheetXml, sharedStrings) {
  const documentXml = new DOMParser().parseFromString(sheetXml, "application/xml");
  const rows = Array.from(documentXml.getElementsByTagNameNS("*", "row")).map((row) => {
    const values = [];

    Array.from(row.getElementsByTagNameNS("*", "c")).forEach((cell) => {
      const cellIndex = getSpreadsheetCellIndex(cell.getAttribute("r"));
      const type = cell.getAttribute("t");
      const rawValue = cell.getElementsByTagNameNS("*", "v")[0]?.textContent || "";
      const value = type === "s"
        ? sharedStrings[Number(rawValue)] || ""
        : type === "inlineStr"
          ? getSpreadsheetText(cell)
          : rawValue;

      values[cellIndex] = value.trim();
    });

    return values;
  });

  return rows
    .filter((row) => /^[A-Z]$/i.test(row[0] || ""))
    .map((row) => ({
      group: row[0] || "",
      targetMinutes: parseTargetMinutes(row[1]) || 0,
      targetLabel: row[1] || "",
      intervalPace: row[2] || "",
      recoveryPace: row[3] || "",
      monthlyMileage: row[4] || "",
      members: row[5] || ""
    }))
    .filter((standard) => standard.group && standard.targetLabel && standard.intervalPace);
}

async function loadRunningGroupStandardsFromXlsx() {
  const response = await fetch(`${RUNNING_GROUP_STANDARD_XLSX_PATH}?v=${Date.now()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`XLSX load failed: ${response.status}`);
  }

  const files = await extractZipEntries(await response.arrayBuffer(), [
    "xl/sharedStrings.xml",
    "xl/worksheets/sheet1.xml"
  ]);
  const sheetXml = files.get("xl/worksheets/sheet1.xml");

  if (!sheetXml) {
    throw new Error("XLSX sheet1.xml not found.");
  }

  const standards = parseRunningGroupStandardsSheet(
    sheetXml,
    parseSharedStrings(files.get("xl/sharedStrings.xml") || "")
  );

  if (!standards.length) {
    throw new Error("No running group standards found in XLSX.");
  }

  return normalizeRunningGroupStandards(standards);
}

function normalizeRunningGroupStandards(standards) {
  if (!Array.isArray(standards)) {
    return DEFAULT_RUNNING_GROUP_STANDARDS.map((standard) => ({ ...standard }));
  }

  return standards
    .map((standard, index) => ({
      group: String(standard.group || DEFAULT_RUNNING_GROUP_STANDARDS[index]?.group || "").trim(),
      targetMinutes: Number(standard.targetMinutes) || DEFAULT_RUNNING_GROUP_STANDARDS[index]?.targetMinutes || 0,
      targetLabel: String(standard.targetLabel || "").trim(),
      intervalPace: String(standard.intervalPace || "").trim(),
      recoveryPace: String(standard.recoveryPace || "").trim(),
      monthlyMileage: String(standard.monthlyMileage || "").trim(),
      members: String(standard.members || DEFAULT_RUNNING_GROUP_STANDARDS[index]?.members || "").trim()
    }))
    .filter((standard) => standard.group);
}

async function loadRunningGroupStandards(user = auth.currentUser) {
  const groupStandardStatus = document.getElementById("groupStandardStatus");

  if (groupStandardStatus) {
    groupStandardStatus.innerText = "조별 기준표를 불러오는 중입니다.";
  }

  try {
    runningGroupStandards = await loadRunningGroupStandardsFromXlsx();
    runningGroupStandardsLoadedFromXlsx = true;
    renderRunningGroupStandards(user);
    renderQualityMonthlyPlan();
    updateMarathonPrediction();
    return;
  } catch (e) {
    console.warn("Running group standards XLSX load failed. Falling back to saved settings.", e);
    runningGroupStandardsLoadedFromXlsx = false;
  }

  if (!user) {
    runningGroupStandards = DEFAULT_RUNNING_GROUP_STANDARDS.map((standard) => ({ ...standard }));
    renderRunningGroupStandards(user);
    renderQualityMonthlyPlan();
    return;
  }

  try {
    const settingsSnapshot = await getDocFromServer(doc(db, "settings", "runningGroupStandards"));

    if (settingsSnapshot.exists()) {
      const data = settingsSnapshot.data();
      runningGroupStandards = normalizeRunningGroupStandards(data.standards);
    } else {
      runningGroupStandards = DEFAULT_RUNNING_GROUP_STANDARDS.map((standard) => ({ ...standard }));
    }

    renderRunningGroupStandards(user);
    renderQualityMonthlyPlan();
    updateMarathonPrediction();
  } catch (e) {
    console.error(e);
    runningGroupStandardsLoadedFromXlsx = false;
    runningGroupStandards = DEFAULT_RUNNING_GROUP_STANDARDS.map((standard) => ({ ...standard }));
    renderRunningGroupStandards(user);
    renderQualityMonthlyPlan();

    if (groupStandardStatus) {
      groupStandardStatus.innerText = RUNNING_GROUP_STANDARD_NOTE;
    }
  }
}

function renderRunningGroupStandards(user = auth.currentUser, editing = false) {
  const groupStandardList = document.getElementById("groupStandardList");
  const groupStandardStatus = document.getElementById("groupStandardStatus");
  const groupStandardActions = document.getElementById("groupStandardActions");
  const editGroupStandardsBtn = document.getElementById("editGroupStandards");
  const saveGroupStandardsBtn = document.getElementById("saveGroupStandards");
  const cancelGroupStandardEditBtn = document.getElementById("cancelGroupStandardEdit");
  const canEdit = isHostUser(user);

  if (!groupStandardList || !groupStandardStatus) return;

  groupStandardList.innerHTML = "";
  groupStandardActions?.classList.toggle("hidden", !canEdit);
  editGroupStandardsBtn?.classList.toggle("hidden", editing || !canEdit);
  saveGroupStandardsBtn?.classList.toggle("hidden", !editing || !canEdit);
  cancelGroupStandardEditBtn?.classList.toggle("hidden", !editing || !canEdit);

  runningGroupStandards.forEach((standard) => {
    const tr = document.createElement("tr");
    const fields = [
      ["group", standard.group],
      ["targetLabel", standard.targetLabel],
      ["intervalPace", standard.intervalPace],
      ["recoveryPace", standard.recoveryPace],
      ["monthlyMileage", standard.monthlyMileage],
      ["members", standard.members || ""]
    ];

    fields.forEach(([field, value]) => {
      const td = document.createElement("td");

      if (editing && canEdit) {
        const input = document.createElement("input");
        input.value = value;
        input.dataset.field = field;
        td.appendChild(input);
      } else {
        td.innerText = value;
      }

      tr.appendChild(td);
    });

    groupStandardList.appendChild(tr);
  });

  const sourceNote = RUNNING_GROUP_STANDARD_NOTE;

  groupStandardStatus.innerText = canEdit
    ? editing
      ? runningGroupStandardsLoadedFromXlsx
        ? "현재 화면은 엑셀 기준입니다. 웹에서 저장한 값은 엑셀을 불러오지 못할 때 백업으로 사용됩니다."
        : "수정 후 저장하면 모든 회원에게 같은 기준표가 표시됩니다."
      : sourceNote
    : sourceNote;
}

function parseTargetMinutes(targetLabel) {
  const match = String(targetLabel || "").match(/(\d+)\s*:\s*(\d+)/);

  if (!match) return 0;

  return (Number(match[1]) * 60) + Number(match[2]);
}

async function saveRunningGroupStandards() {
  const user = auth.currentUser;
  const groupStandardList = document.getElementById("groupStandardList");
  const groupStandardStatus = document.getElementById("groupStandardStatus");

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 기준표를 수정할 수 있습니다.");
    return;
  }

  const rows = Array.from(groupStandardList?.querySelectorAll("tr") || []);
  const standards = rows.map((row, index) => {
    const values = {};

    row.querySelectorAll("input").forEach((input) => {
      values[input.dataset.field] = input.value.trim();
    });

    const targetMinutes = parseTargetMinutes(values.targetLabel)
      || runningGroupStandards[index]?.targetMinutes
      || DEFAULT_RUNNING_GROUP_STANDARDS[index]?.targetMinutes
      || 0;

    return {
      group: values.group,
      targetMinutes,
      targetLabel: values.targetLabel,
      intervalPace: values.intervalPace,
      recoveryPace: values.recoveryPace,
      monthlyMileage: values.monthlyMileage,
      members: values.members || ""
    };
  });

  if (standards.some((standard) => !standard.group || !standard.targetLabel || !standard.intervalPace || !standard.recoveryPace || !standard.monthlyMileage)) {
    alert("기준표의 모든 칸을 입력해주세요.");
    return;
  }

  try {
    await setDoc(doc(db, "settings", "runningGroupStandards"), {
      standards,
      updatedAt: new Date(),
      updatedBy: user.email
    });

    runningGroupStandards = normalizeRunningGroupStandards(standards);
    renderRunningGroupStandards(user, false);
    renderQualityMonthlyPlan();
    updateMarathonPrediction();
    alert("조별 기준표를 저장했습니다.");
  } catch (e) {
    console.error(e);
    if (groupStandardStatus) {
      groupStandardStatus.innerText = "기준표 저장에 실패했습니다. Firestore 권한을 확인해주세요.";
    }
    alert("기준표 저장에 실패했습니다. Firestore 권한을 확인해주세요.");
  }
}

async function deleteRun(run) {
  const user = auth.currentUser;

  if (!user || !run?.id) {
    alert("삭제할 기록을 확인하지 못했습니다. 다시 로그인 후 시도해주세요.");
    return;
  }

  const confirmed = confirm(`${run.runDate || "선택한 날짜"} ${run.distance}km 기록을 삭제할까요?`);

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "runs", run.id));
    if (editingRun?.id === run.id) {
      resetRunForm();
    }
    if (editingQualityRun?.id === run.id) {
      resetQualityForm();
    }
    await loadMyRuns(user);
    await loadClubRanking(user);
    await loadWeeklyRanking(user);
    if (selectedAdminMember && run.userId === selectedAdminMember.userId) {
      await loadMemberRuns(selectedAdminMember);
    }
    alert("기록을 삭제했습니다.");
  } catch (e) {
    console.error(e);
    if (e.code === "permission-denied") {
      alert("기록 삭제 권한이 아직 적용되지 않았습니다. Firestore 보안 규칙 배포 후 다시 시도해주세요.");
      return;
    }

    alert(`기록 삭제에 실패했습니다. ${e.message}`);
  }
}

async function loadSuggestions(user = auth.currentUser) {
  const suggestionStatus = document.getElementById("suggestionStatus");
  const suggestionList = document.getElementById("suggestionList");

  if (!suggestionStatus || !suggestionList) return;

  if (!user) {
    latestSuggestions = [];
    suggestionList.innerHTML = "";
    suggestionStatus.innerText = "로그인 후 제안 목록을 확인할 수 있습니다.";
    return;
  }

  suggestionStatus.innerText = "제안을 불러오는 중입니다.";

  try {
    const querySnapshot = await getDocsFromServer(collection(db, "suggestions"));
    latestSuggestions = [];

    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      latestSuggestions.push({
        id: snapshotDoc.id,
        type: data.type || "other",
        title: data.title || "제목 없음",
        content: data.content || "",
        userId: data.userId || "",
        name: data.name || data.email || "이름 없음",
        email: data.email || "",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
        reply: data.reply || "",
        replyAuthor: data.replyAuthor || "",
        replyAuthorEmail: data.replyAuthorEmail || "",
        repliedAt: data.repliedAt || null
      });
    });

    latestSuggestions.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bTime - aTime;
    });

    renderSuggestions(user);
  } catch (e) {
    console.error(e);
    suggestionStatus.innerText = "제안 목록을 불러오지 못했습니다. Firestore 권한을 확인해주세요.";
  }
}

function renderSuggestions(user = auth.currentUser) {
  const suggestionStatus = document.getElementById("suggestionStatus");
  const suggestionList = document.getElementById("suggestionList");

  if (!suggestionStatus || !suggestionList) return;

  suggestionList.innerHTML = "";

  if (!latestSuggestions.length) {
    suggestionStatus.innerText = "아직 등록된 제안이 없습니다.";
    return;
  }

  suggestionStatus.innerText = `${latestSuggestions.length}개 제안`;

  latestSuggestions.forEach((suggestion) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";

    const meta = document.createElement("div");
    meta.className = "suggestion-meta";

    const typeBadge = document.createElement("span");
    typeBadge.className = "suggestion-type";
    typeBadge.innerText = getSuggestionTypeLabel(suggestion.type);
    meta.appendChild(typeBadge);

    const author = document.createElement("span");
    author.innerText = suggestion.name;
    meta.appendChild(author);

    const createdAt = document.createElement("span");
    createdAt.innerText = formatSavedDateTime(suggestion.createdAt) || "-";
    meta.appendChild(createdAt);
    card.appendChild(meta);

    const title = document.createElement("div");
    title.className = "suggestion-title";
    title.innerText = suggestion.title;
    card.appendChild(title);

    const body = document.createElement("div");
    body.className = "suggestion-body";
    body.innerText = suggestion.content;
    card.appendChild(body);

    if (suggestion.reply) {
      const reply = document.createElement("div");
      reply.className = "suggestion-reply";

      const replyTitle = document.createElement("div");
      replyTitle.className = "suggestion-reply-title";
      const replyDate = formatSavedDateTime(suggestion.repliedAt);
      replyTitle.innerText = replyDate ? `호스트 답글 · ${replyDate}` : "호스트 답글";
      reply.appendChild(replyTitle);

      const replyBody = document.createElement("div");
      replyBody.innerText = suggestion.reply;
      reply.appendChild(replyBody);
      card.appendChild(reply);
    }

    if (isHostUser(user)) {
      const replyForm = document.createElement("div");
      replyForm.className = "suggestion-reply-form";

      const replyLabel = document.createElement("label");
      replyLabel.innerText = "호스트 답글";

      const replyTextarea = document.createElement("textarea");
      replyTextarea.maxLength = 1200;
      replyTextarea.placeholder = "답글을 입력해주세요.";
      replyTextarea.value = suggestion.reply || "";
      replyLabel.appendChild(replyTextarea);
      replyForm.appendChild(replyLabel);

      const actionRow = document.createElement("div");
      actionRow.className = "form-row";

      const replyBtn = document.createElement("button");
      replyBtn.type = "button";
      replyBtn.className = "table-action";
      replyBtn.innerText = suggestion.reply ? "답글 수정" : "답글 등록";
      replyBtn.addEventListener("click", () => {
        saveSuggestionReply(suggestion, replyTextarea.value);
      });
      actionRow.appendChild(replyBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "button-danger table-action";
      deleteBtn.innerText = "제안 삭제";
      deleteBtn.addEventListener("click", () => {
        deleteSuggestion(suggestion);
      });
      actionRow.appendChild(deleteBtn);

      replyForm.appendChild(actionRow);
      card.appendChild(replyForm);
    }

    suggestionList.appendChild(card);
  });
}

async function saveSuggestionReply(suggestion, replyText) {
  const user = auth.currentUser;
  const reply = replyText.trim();

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 답글을 등록할 수 있습니다.");
    return;
  }

  if (!reply) {
    alert("답글 내용을 입력해주세요.");
    return;
  }

  try {
    await updateDoc(doc(db, "suggestions", suggestion.id), {
      reply,
      replyAuthor: getUserName(user),
      replyAuthorEmail: user.email,
      repliedAt: new Date(),
      updatedAt: new Date()
    });

    await loadSuggestions(user);
    alert("답글을 저장했습니다.");
  } catch (e) {
    console.error(e);
    alert("답글 저장에 실패했습니다. Firestore 권한을 확인해주세요.");
  }
}

async function deleteSuggestion(suggestion) {
  const user = auth.currentUser;

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 제안을 삭제할 수 있습니다.");
    return;
  }

  const confirmed = confirm(`"${suggestion.title}" 제안을 삭제할까요?`);

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "suggestions", suggestion.id));
    await loadSuggestions(user);
    alert("제안을 삭제했습니다.");
  } catch (e) {
    console.error(e);
    alert("제안 삭제에 실패했습니다. Firestore 권한을 확인해주세요.");
  }
}

async function loadMembers() {
  const user = auth.currentUser;
  const memberList = document.getElementById("memberList");
  const memberStatus = document.getElementById("memberStatus");

  if (!memberList || !memberStatus) return;

  memberList.innerHTML = "";

  if (!isHostUser(user)) {
    memberStatus.innerText = "호스트 계정에서만 회원 관리가 가능합니다.";
    return;
  }

  memberStatus.innerText = "회원 목록을 불러오는 중입니다...";

  try {
    const querySnapshot = await getDocsFromServer(collection(db, "users"));
    const members = [];

    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      members.push({
        id: snapshotDoc.id,
        userId: data.userId || snapshotDoc.id,
        name: data.name || "이름 없음",
        email: data.email || "",
        approved: data.approved !== false,
        disabled: Boolean(data.disabled),
        role: data.role || (data.email?.toLowerCase() === HOST_EMAIL ? "host" : "member")
      });
    });

    members.sort((a, b) => a.name.localeCompare(b.name, "ko"));

    members.forEach((member) => {
      const tr = document.createElement("tr");
      const isHostMember = member.email.toLowerCase() === HOST_EMAIL;
      const memberStatusText = isHostMember
        ? "호스트"
        : member.disabled
          ? "이용 정지"
          : member.approved
            ? "승인 완료"
            : "승인 대기";
      const cells = [
        member.name,
        member.email || "-",
        memberStatusText
      ];

      cells.forEach((value, index) => {
        const td = document.createElement("td");
        td.innerText = value;

        if (index === 2 && member.disabled) {
          td.classList.add("member-disabled");
        }

        if (index === 2 && !member.approved && !member.disabled && !isHostMember) {
          td.classList.add("member-pending");
        }

        tr.appendChild(td);
      });

      const actionTd = document.createElement("td");
      actionTd.className = "member-action-cell";
      const actionWrap = document.createElement("div");
      actionWrap.className = "member-action-stack";

      const recordsBtn = document.createElement("button");
      recordsBtn.type = "button";
      recordsBtn.className = "table-action";
      recordsBtn.innerText = "기록 보기";
      recordsBtn.addEventListener("click", () => {
        loadMemberRuns(member);
      });
      actionWrap.appendChild(recordsBtn);

      if (isHostMember) {
        recordsBtn.disabled = true;
      } else {
        if (!member.approved) {
          const approveBtn = document.createElement("button");
          approveBtn.type = "button";
          approveBtn.className = "table-action";
          approveBtn.innerText = "승인";
          approveBtn.addEventListener("click", () => {
            approveMember(member);
          });
          actionWrap.appendChild(approveBtn);
        }

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = member.disabled ? "table-action" : "button-danger table-action";
        toggleBtn.innerText = member.disabled ? "정지 해제" : "이용 정지";
        toggleBtn.addEventListener("click", () => {
          toggleMemberAccess(member, !member.disabled);
        });
        actionWrap.appendChild(toggleBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "button-danger table-action";
        deleteBtn.innerText = "삭제";
        deleteBtn.addEventListener("click", () => {
          deleteMemberData(member);
        });
        actionWrap.appendChild(deleteBtn);
      }

      actionTd.appendChild(actionWrap);
      tr.appendChild(actionTd);
      memberList.appendChild(tr);
    });

    memberStatus.innerText = `등록 회원 ${members.length}명`;
  } catch (e) {
    console.error(e);
    memberStatus.innerText = "회원 목록을 불러오지 못했습니다.";
  }
}

function clearMemberRunsPanel() {
  selectedAdminMember = null;
  selectedAdminRuns = [];
  editingRun = null;

  const panel = document.getElementById("memberRunsPanel");
  const title = document.getElementById("memberRunsTitle");
  const status = document.getElementById("memberRunsStatus");
  const list = document.getElementById("memberRunsList");

  if (panel) panel.classList.add("hidden");
  if (title) title.innerText = "회원 기록";
  if (status) status.innerText = "회원을 선택하면 기록을 확인할 수 있습니다.";
  if (list) list.innerHTML = "";
  updateRunFormMode();
}

async function loadMemberRuns(member) {
  const user = auth.currentUser;
  const panel = document.getElementById("memberRunsPanel");
  const title = document.getElementById("memberRunsTitle");
  const status = document.getElementById("memberRunsStatus");
  const list = document.getElementById("memberRunsList");

  if (!panel || !title || !status || !list) return;

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 회원 기록을 확인할 수 있습니다.");
    return;
  }

  selectedAdminMember = member;
  selectedAdminRuns = [];
  panel.classList.remove("hidden");
  title.innerText = `${member.name} 회원 기록`;
  status.innerText = "회원 기록을 불러오는 중입니다...";
  list.innerHTML = "";

  try {
    const runsQuery = query(
      collection(db, "runs"),
      where("userId", "==", member.userId)
    );
    const runsSnapshot = await getDocsFromServer(runsQuery);
    const runIds = new Set();

    runsSnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      runIds.add(snapshotDoc.id);
      selectedAdminRuns.push(buildRunRecord(snapshotDoc.id, data, member));
    });

    if (member.email) {
      const legacyRunsQuery = query(
        collection(db, "runs"),
        where("email", "==", member.email)
      );
      const legacyRunsSnapshot = await getDocsFromServer(legacyRunsQuery);

      legacyRunsSnapshot.forEach((snapshotDoc) => {
        if (runIds.has(snapshotDoc.id)) return;
        selectedAdminRuns.push(buildRunRecord(snapshotDoc.id, snapshotDoc.data(), member));
      });
    }

    selectedAdminRuns.sort((a, b) => (b.runDate || "").localeCompare(a.runDate || ""));
    renderMemberRuns();
  } catch (e) {
    console.error(e);
    status.innerText = "회원 기록을 불러오지 못했습니다. Firestore 권한을 확인해주세요.";
  }
}

function buildRunRecord(id, data, fallbackMember = null) {
  const distance = Number(data.distance);
  const time = Number(data.time);

  return {
    id,
    distance,
    time,
    runDate: getSavedRunDate(data),
    type: data.type || "training",
    workoutType: data.workoutType || (data.type === "training" && String(data.raceName || "").startsWith("[고강도]") ? "other" : "steady"),
    workoutDetail: data.workoutDetail || (data.type === "training" && String(data.raceName || "").startsWith("[고강도]") ? String(data.raceName).replace(/^\[고강도\]\s*/, "") : ""),
    qualityPlanDate: data.qualityPlanDate || "",
    qualityPlannedWorkout: data.qualityPlannedWorkout || "",
    qualitySetResults: data.qualitySetResults || "",
    qualitySelfRating: data.qualitySelfRating || "",
    qualityReflection: data.qualityReflection || "",
    rankingEligible: data.rankingEligible !== false,
    raceName: data.raceName || "",
    raceDate: data.raceDate || "",
    userId: data.userId || fallbackMember?.userId || "",
    name: data.name || fallbackMember?.name || "이름 없음",
    email: data.email || fallbackMember?.email || ""
  };
}

function renderMemberRuns() {
  const status = document.getElementById("memberRunsStatus");
  const list = document.getElementById("memberRunsList");

  if (!status || !list) return;

  list.innerHTML = "";

  selectedAdminRuns.forEach((run) => {
    const runType = run.type === "race" ? "대회" : "훈련";
    const pace = run.time / run.distance;
    const tr = document.createElement("tr");
    const cells = [
      run.runDate || "-",
      runType,
      `${run.distance}km`,
      formatTime(run.time),
      formatPace(pace),
      getRunDetailDisplay(run)
    ];

    cells.forEach((value) => {
      const td = document.createElement("td");
      td.innerText = value;
      tr.appendChild(td);
    });

    const actionTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "table-action";
    editBtn.innerText = "수정";
    editBtn.addEventListener("click", () => {
      beginRunEdit(run);
    });
    actionTd.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "button-danger table-action";
    deleteBtn.innerText = "삭제";
    deleteBtn.addEventListener("click", () => {
      deleteRun(run);
    });
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);
    list.appendChild(tr);
  });

  status.innerText = selectedAdminRuns.length
    ? `${selectedAdminRuns.length}개 기록`
    : "저장된 운동 기록이 없습니다.";
}

async function toggleMemberAccess(member, disabled) {
  const user = auth.currentUser;

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 회원 상태를 변경할 수 있습니다.");
    return;
  }

  const actionText = disabled ? "이용 정지" : "정지 해제";
  const confirmed = confirm(`${member.name} 회원을 ${actionText}할까요?`);

  if (!confirmed) return;

  try {
    await setDoc(doc(db, "users", member.userId), {
      userId: member.userId,
      email: member.email,
      name: member.name,
      approved: member.approved,
      disabled,
      updatedAt: new Date()
    }, { merge: true });

    await loadMembers();
    alert(`${actionText} 처리했습니다.`);
  } catch (e) {
    console.error(e);
    alert("회원 상태 변경에 실패했습니다.");
  }
}

async function approveMember(member) {
  const user = auth.currentUser;

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 회원을 승인할 수 있습니다.");
    return;
  }

  const confirmed = confirm(`${member.name} (${member.email}) 회원 가입을 승인할까요?`);

  if (!confirmed) return;

  try {
    await setDoc(doc(db, "users", member.userId), {
      userId: member.userId,
      email: member.email,
      name: member.name,
      approved: true,
      disabled: false,
      updatedAt: new Date()
    }, { merge: true });

    await loadMembers();
    alert("회원 가입을 승인했습니다.");
  } catch (e) {
    console.error(e);
    alert("회원 승인에 실패했습니다. Firestore 권한을 확인해주세요.");
  }
}

async function deleteMemberData(member) {
  const user = auth.currentUser;

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 회원 데이터를 삭제할 수 있습니다.");
    return;
  }

  if (member.email.toLowerCase() === HOST_EMAIL) {
    alert("호스트 계정은 삭제할 수 없습니다.");
    return;
  }

  const confirmed = confirm(
    `${member.name} (${member.email}) 회원의 앱 데이터를 삭제할까요?\n저장된 러닝 기록과 회원 관리 프로필이 삭제됩니다.\nFirebase 로그인 계정 자체는 Authentication에서 별도로 삭제해야 합니다.`
  );

  if (!confirmed) return;

  try {
    const runsQuery = query(
      collection(db, "runs"),
      where("userId", "==", member.userId)
    );
    const runsSnapshot = await getDocsFromServer(runsQuery);
    const runIdsToDelete = new Set();

    runsSnapshot.forEach((snapshotDoc) => {
      runIdsToDelete.add(snapshotDoc.id);
    });

    if (member.email) {
      const legacyRunsQuery = query(
        collection(db, "runs"),
        where("email", "==", member.email)
      );
      const legacyRunsSnapshot = await getDocsFromServer(legacyRunsQuery);

      legacyRunsSnapshot.forEach((snapshotDoc) => {
        runIdsToDelete.add(snapshotDoc.id);
      });
    }

    const deletions = Array.from(runIdsToDelete).map((runId) => deleteDoc(doc(db, "runs", runId)));
    deletions.push(deleteDoc(doc(db, "users", member.userId)));

    await Promise.all(deletions);
    await loadMembers();
    await loadClubRanking(user);
    await loadWeeklyRanking(user);
    alert("회원 앱 데이터를 삭제했습니다. Authentication 계정은 Firebase Console에서 별도로 삭제해주세요.");
  } catch (e) {
    console.error(e);
    alert("회원 데이터 삭제에 실패했습니다. Firestore 권한을 확인해주세요.");
  }
}

async function deleteRankingRecord(entry) {
  const user = auth.currentUser;

  if (!isHostUser(user)) {
    alert("호스트 계정에서만 랭킹 기록을 삭제할 수 있습니다.");
    return;
  }

  const confirmed = confirm(
    `${entry.name} 회원의 ${getDistanceLabel(entry.distance)} 기록 ${formatTime(entry.time)}을 삭제할까요?\n원기록: ${(entry.originalDistance || entry.distance)}km ${formatTime(entry.originalTime || entry.time)}\n운동일: ${entry.runDate || "-"}`
  );

  if (!confirmed) return;

  try {
    const querySnapshot = await getDocsFromServer(collection(db, "runs"));
    const runIdsToDelete = new Set([entry.id]);

    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();

      if (isSameRankingRecord(data, entry)) {
        runIdsToDelete.add(snapshotDoc.id);
      }
    });

    await Promise.all(
      Array.from(runIdsToDelete).map((runId) => deleteDoc(doc(db, "runs", runId)))
    );
    await loadMyRuns(user);
    await loadClubRanking(user);
    await loadWeeklyRanking(user);
    alert(`랭킹 기록 ${runIdsToDelete.size}개를 삭제했습니다.`);
  } catch (e) {
    console.error(e);
    alert("랭킹 기록 삭제에 실패했습니다. Firestore 권한을 확인해주세요.");
  }
}

function isSameRankingRecord(data, entry) {
  const distance = Number(data.distance);
  const time = Number(data.time);
  const runDate = getSavedRunDate(data);
  const runType = data.type === "race" ? "대회" : "훈련";
  const identityMatches = entry.email
    ? data.email === entry.email || data.userId === entry.userId
    : entry.userId
      ? data.userId === entry.userId || data.email === entry.userId
      : !data.userId && !data.email;

  return identityMatches
    && Number.isFinite(distance)
    && Number.isFinite(time)
    && Math.abs(distance - (entry.originalDistance || entry.distance)) < 0.001
    && Math.abs(time - (entry.originalTime || entry.time)) < 0.001
    && runDate === entry.runDate
    && runType === entry.type
    && (data.raceName || "") === (entry.raceName || "");
}

function updateMileageSummary(runs) {
  const mileageSummary = document.getElementById("mileageSummary");

  if (!mileageSummary) return;

  mileageSummary.innerText = [
    `${getMileageSummaryPrefix()} 마일리지`,
    `주간: ${formatMileage(sumMileageByPeriod(runs, "week"))}, 월간: ${formatMileage(sumMileageByPeriod(runs, "month"))}, 연간: ${formatMileage(sumMileageByPeriod(runs, "year"))}`
  ].join("\n");
}

async function loadMonthlyGoal(user) {
  const monthlyGoalInput = document.getElementById("monthlyGoal");
  const monthKey = getCurrentMonthKey();

  if (!user || !monthlyGoalInput) return;

  try {
    const goalRef = doc(db, "monthlyGoals", `${user.uid}_${monthKey}`);
    const goalSnapshot = await getDocFromServer(goalRef);

    monthlyGoalLocked = goalSnapshot.exists();
    monthlyGoalKm = monthlyGoalLocked ? Number(goalSnapshot.data().goalKm) || 0 : 0;
    monthlyGoalInput.value = monthlyGoalKm || "";
    updateMonthlyGoalForm();
    updateMonthlyGoalStatus(latestRuns);
  } catch (e) {
    console.error(e);
    monthlyGoalKm = 0;
    monthlyGoalLocked = false;
    updateMonthlyGoalForm();
    updateMonthlyGoalStatus(latestRuns, "월 목표를 불러오지 못했습니다.");
  }
}

async function saveMonthlyGoal(user, goalKm) {
  const monthKey = getCurrentMonthKey();
  const goalRef = doc(db, "monthlyGoals", `${user.uid}_${monthKey}`);

  monthlyGoalKm = goalKm;
  monthlyGoalLocked = true;

  await setDoc(goalRef, {
    userId: user.uid,
    email: user.email,
    name: getUserName(user),
    month: monthKey,
    goalKm,
    updatedAt: new Date()
  });

  updateMonthlyGoalForm();
}

function updateMonthlyGoalForm() {
  const monthlyGoalInput = document.getElementById("monthlyGoal");
  const saveMonthlyGoalBtn = document.getElementById("saveMonthlyGoal");

  if (!monthlyGoalInput || !saveMonthlyGoalBtn) return;

  monthlyGoalInput.disabled = monthlyGoalLocked;
  saveMonthlyGoalBtn.disabled = monthlyGoalLocked;
  saveMonthlyGoalBtn.innerText = monthlyGoalLocked ? "설정 완료" : "목표 저장";
}

function updateMonthlyGoalStatus(runs, errorMessage = "") {
  const monthlyGoalStatus = document.getElementById("monthlyGoalStatus");

  if (!monthlyGoalStatus) return;

  if (errorMessage) {
    monthlyGoalStatus.innerText = errorMessage;
    monthlyGoalStatus.classList.remove("goal-star");
    return;
  }

  if (!monthlyGoalKm) {
    monthlyGoalStatus.innerText = "목표 입력 전";
    monthlyGoalStatus.classList.remove("goal-star");
    return;
  }

  const monthKey = getCurrentMonthKey();
  const currentMileage = sumMileageByMonth(runs, monthKey);
  const remaining = Math.max(monthlyGoalKm - currentMileage, 0);
  const progress = Math.min(Math.round((currentMileage / monthlyGoalKm) * 100), 100);

  if (currentMileage >= monthlyGoalKm) {
    monthlyGoalStatus.innerText = `목표 달성: ${formatMileage(currentMileage)} / ${formatMileage(monthlyGoalKm)} (${progress}%)`;
    monthlyGoalStatus.classList.add("goal-star");
    return;
  }

  monthlyGoalStatus.innerText = `${formatMileage(currentMileage)} / ${formatMileage(monthlyGoalKm)} (${progress}%), ${formatMileage(remaining)} 남음`;
  monthlyGoalStatus.classList.remove("goal-star");
}

function updatePeriodStats(runs) {
  const periodStats = document.getElementById("periodStats");

  if (!periodStats) return;

  periodStats.innerHTML = "";

  [
    { label: "주간", value: "week" }
  ].forEach((period) => {
    const periodRuns = filterRunsByPeriod(runs, period.value);
    const stats = calculateRunStats(periodRuns);
    const tr = document.createElement("tr");
    const cells = [
      getPeriodRangeText(period.value),
      `${stats.count}회`,
      formatMileage(stats.totalDistance),
      stats.totalTime ? formatTime(stats.totalTime) : "-",
      stats.averagePace ? formatPace(stats.averagePace) : "-",
      stats.longestDistance ? formatMileage(stats.longestDistance) : "-"
    ];

    cells.forEach((value) => {
      const td = document.createElement("td");
      td.innerText = value;
      tr.appendChild(td);
    });

    periodStats.appendChild(tr);
  });
}

function calculateRunStats(runs) {
  const count = runs.length;
  const totalDistance = runs.reduce((total, run) => total + run.distance, 0);
  const totalTime = runs.reduce((total, run) => total + run.time, 0);
  const longestDistance = runs.reduce((longest, run) => Math.max(longest, run.distance), 0);
  const averagePace = totalDistance ? totalTime / totalDistance : 0;

  return {
    count,
    totalDistance,
    totalTime,
    averagePace,
    longestDistance
  };
}

function getDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function filterRunsBetween(runs, startDate, endDate) {
  return runs.filter((run) => {
    const runDate = parseInputDate(run.runDate);
    return runDate && runDate >= startDate && runDate <= endDate;
  });
}

function getFriendlyMessage(messages, seed = "") {
  if (!messages.length) return "";

  const key = `${getTodayDateString()}-${seed}`;
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash * 31) + key.charCodeAt(index)) % 1000003;
  }

  return messages[hash % messages.length];
}

function updateEngagementPanels(runs) {
  updateWeeklyInsight(runs);
  updateWeeklyBadges(runs);
  updateDailyRecommendation(runs);
  updatePbCelebration(runs);
}

function updateWeeklyInsight(runs) {
  const weeklyInsight = document.getElementById("weeklyInsight");

  if (!weeklyInsight) return;

  const weekRuns = filterRunsByPeriod(runs, "week");
  const weekStats = calculateRunStats(weekRuns);

  if (!weekStats.count) {
    weeklyInsight.innerText = getFriendlyMessage([
      "이번 주 러닝 노트는 아직 비어 있어요. 오늘은 가볍게 한 줄만 채워볼까요?",
      "아직 이번 주 첫 발자국 전이에요. 20분만 편하게 나가도 흐름은 시작됩니다.",
      "이번 주는 아직 준비 운동 중입니다. 짧고 편한 러닝 하나면 충분해요."
    ], "weekly-empty");
    return;
  }

  const previousStart = getDateDaysAgo(13);
  const previousEnd = getDateDaysAgo(7);
  previousEnd.setHours(23, 59, 59, 999);
  const previousStats = calculateRunStats(filterRunsBetween(runs, previousStart, previousEnd));
  const diff = weekStats.totalDistance - previousStats.totalDistance;
  const comparison = previousStats.count
    ? diff >= 0
      ? getFriendlyMessage([
          `지난 7일보다 ${formatMileage(diff)} 더 쌓았어요. 몸이 잘 받아주고 있는 흐름입니다.`,
          `지난주보다 ${formatMileage(diff)} 앞서 있어요. 욕심은 조금만, 리듬은 그대로 가면 좋겠습니다.`,
          `지난 7일보다 ${formatMileage(diff)} 더 달렸네요. 꾸준함이 조용히 힘을 내고 있어요.`
        ], `weekly-up-${weekStats.count}-${Math.round(diff * 10)}`)
      : getFriendlyMessage([
          `지난 7일보다 ${formatMileage(Math.abs(diff))} 줄었어요. 괜찮아요, 회복도 훈련의 일부입니다.`,
          `이번 주는 지난주보다 살짝 덜 달렸어요. 몸을 아끼는 주간도 오래 달리기엔 꼭 필요해요.`,
          `거리는 조금 줄었지만 흐름은 이어지고 있어요. 오늘의 컨디션부터 잘 챙겨가요.`
        ], `weekly-down-${weekStats.count}-${Math.round(Math.abs(diff) * 10)}`)
    : getFriendlyMessage([
        "이번 주 흐름을 새로 만들고 있어요. 시작이 이미 반입니다.",
        "이번 주 첫 기록이 들어왔네요. 이제 몸이 리듬을 기억하기 시작할 거예요.",
        "좋아요, 이번 주 러닝 스위치가 켜졌습니다. 다음 기록은 조금 더 편해질 거예요."
      ], `weekly-new-${weekStats.count}`);

  weeklyInsight.innerText = getFriendlyMessage([
    `이번 주는 ${weekStats.count}번, 총 ${formatMileage(weekStats.totalDistance)} 달렸어요. 평균 페이스는 ${formatPace(weekStats.averagePace)}. ${comparison}`,
    `${formatMileage(weekStats.totalDistance)}를 ${weekStats.count}번에 나눠 잘 쌓았습니다. 평균 ${formatPace(weekStats.averagePace)}로 차분한 흔적이 남았어요. ${comparison}`,
    `이번 주 러닝 기록은 ${weekStats.count}회입니다. 누적 ${formatMileage(weekStats.totalDistance)}, 평균 ${formatPace(weekStats.averagePace)}. ${comparison}`
  ], `weekly-summary-${weekStats.count}-${Math.round(weekStats.totalDistance * 10)}`);
}

function updateWeeklyBadges(runs) {
  const weeklyBadges = document.getElementById("weeklyBadges");

  if (!weeklyBadges) return;

  const weekRuns = filterRunsByPeriod(runs, "week");
  const weekStats = calculateRunStats(weekRuns);
  const monthMileage = sumMileageByMonth(runs, getCurrentMonthKey());
  const badges = [];

  if (weekStats.count >= 1) badges.push({ icon: "🏃", label: "이번 주 첫 러닝" });
  if (weekStats.count >= 3) badges.push({ icon: "📅", label: "주 3회 출석" });
  if (weekStats.totalDistance >= 20) badges.push({ icon: "⚡", label: "주간 20km" });
  if (weekStats.totalDistance >= 42.195) badges.push({ icon: "🏅", label: "주간 마라톤 거리" });
  if (monthlyGoalKm && monthMileage >= monthlyGoalKm * 0.5) badges.push({ icon: "🌗", label: "월 목표 50%" });
  if (monthlyGoalKm && monthMileage >= monthlyGoalKm) badges.push({ icon: "🎉", label: "월 목표 달성" });
  if (hasRecentPersonalBest(runs, 30)) badges.push({ icon: "🚀", label: "최근 PB 갱신" });
  if (hasTwoWeekStreak(runs)) badges.push({ icon: "🔥", label: "2주 연속 러닝" });

  weeklyBadges.innerHTML = "";

  if (!badges.length) {
    weeklyBadges.appendChild(createRunBadge({ icon: "✨", label: "기록 대기 중" }, true));
    return;
  }

  badges.forEach((badgeData) => {
    weeklyBadges.appendChild(createRunBadge(badgeData));
  });
}

function createRunBadge({ icon, label }, isWaiting = false) {
  const badge = document.createElement("span");
  badge.className = isWaiting ? "run-badge run-badge-waiting" : "run-badge";

  const badgeIcon = document.createElement("span");
  badgeIcon.className = "run-badge-icon";
  badgeIcon.innerText = icon;
  badge.appendChild(badgeIcon);

  const badgeText = document.createElement("span");
  badgeText.className = "run-badge-text";
  badgeText.innerText = label;
  badge.appendChild(badgeText);

  return badge;
}

function updateDailyRecommendation(runs) {
  const dailyRecommendation = document.getElementById("dailyRecommendation");

  if (!dailyRecommendation) return;

  if (!runs.length) {
    dailyRecommendation.innerText = getFriendlyMessage([
      "오늘은 기록보다 산책 같은 조깅으로 시작해봐요. 20~30분이면 충분합니다.",
      "첫 기록은 가볍게 남기는 게 제일 좋아요. 숨이 편한 속도로 20분만 다녀와도 성공입니다.",
      "오늘의 목표는 멋진 기록보다 문밖으로 나가기. 편한 조깅 20~30분을 추천해요."
    ], "daily-empty");
    return;
  }

  const weekRuns = filterRunsByPeriod(runs, "week");
  const weekStats = calculateRunStats(weekRuns);
  const latestRun = runs[0];
  const latestRunDate = parseInputDate(latestRun.runDate);
  const daysSinceLatest = latestRunDate
    ? Math.floor((getDateDaysAgo(0) - latestRunDate) / (1000 * 60 * 60 * 24))
    : null;
  const monthMileage = sumMileageByMonth(runs, getCurrentMonthKey());

  if (daysSinceLatest !== null && daysSinceLatest >= 7) {
    dailyRecommendation.innerText = getFriendlyMessage([
      "러닝 사이가 조금 벌어졌어요. 오늘은 기록 말고 리듬만 되찾는 30분 조깅이 좋겠습니다.",
      "오랜만에 뛰는 날이라면 몸에게 먼저 인사부터 해주세요. 편한 30분 조깅을 추천해요.",
      "오늘은 다시 켜는 날입니다. 빠르게 말고 부드럽게, 30분 정도만 달려봐요."
    ], `daily-gap-${daysSinceLatest}`);
    return;
  }

  if (weekStats.count >= 4 || weekStats.totalDistance >= 40) {
    dailyRecommendation.innerText = getFriendlyMessage([
      "이번 주는 이미 꽤 잘 쌓았어요. 오늘은 회복 조깅이나 휴식으로 다음 훈련을 살려두면 좋겠습니다.",
      "몸에 적립한 마일리지가 충분해요. 오늘은 30분 이내 아주 편한 조깅, 아니면 쉬어도 좋습니다.",
      "잘 달린 주간입니다. 오늘 더 밀어붙이기보다 다리를 가볍게 풀어주는 쪽을 추천해요."
    ], `daily-recovery-${weekStats.count}-${Math.round(weekStats.totalDistance)}`);
    return;
  }

  if (monthlyGoalKm && monthMileage < monthlyGoalKm * 0.7) {
    const remaining = Math.max(monthlyGoalKm - monthMileage, 0);
    dailyRecommendation.innerText = getFriendlyMessage([
      `월 목표까지 ${formatMileage(remaining)} 남았어요. 오늘은 부담 없이 5~8km만 보태볼까요?`,
      `목표까지 아직 여유가 조금 필요해요. 오늘 5~8km를 편하게 쌓으면 마음이 꽤 가벼워질 거예요.`,
      `오늘은 월 목표에 한 걸음 붙는 날로 가보죠. 대화 가능한 페이스로 5~8km 추천합니다.`
    ], `daily-goal-${Math.round(remaining * 10)}`);
    return;
  }

  if (pb["10K"]) {
    const easyPace = formatPace(pb["10K"].pace * 1.25);
    dailyRecommendation.innerText = getFriendlyMessage([
      `오늘은 10K PB보다 한참 여유 있게 가요. ${easyPace} 전후로 편안한 조깅을 추천합니다.`,
      `다리를 살리는 날로 잡아볼까요? ${easyPace} 근처에서 말이 나오는 페이스면 딱 좋습니다.`,
      `오늘은 빠른 나보다 오래 가는 나를 챙기는 날입니다. ${easyPace} 전후 조깅이 좋아요.`
    ], `daily-pb-${Math.round(pb["10K"].pace * 100)}`);
    return;
  }

  dailyRecommendation.innerText = getFriendlyMessage([
    "오늘은 대화가 가능한 페이스로 5km만 가볍게 쌓아봐요.",
    "무리할 필요 없는 날입니다. 편한 호흡으로 5km, 꾸준함 하나만 챙겨요.",
    "오늘의 추천은 담백하게 5km 조깅입니다. 끝나고 기분 좋은 정도면 성공이에요."
  ], "daily-default");
}

function hasTwoWeekStreak(runs) {
  const currentStart = getDateDaysAgo(6);
  const currentEnd = getDateDaysAgo(0);
  currentEnd.setHours(23, 59, 59, 999);
  const previousStart = getDateDaysAgo(13);
  const previousEnd = getDateDaysAgo(7);
  previousEnd.setHours(23, 59, 59, 999);

  return filterRunsBetween(runs, currentStart, currentEnd).length > 0
    && filterRunsBetween(runs, previousStart, previousEnd).length > 0;
}

function getPersonalBestCategoriesForRun(run) {
  if (run.rankingEligible === false) return [];

  return PB_CATEGORIES.filter((category) => {
    const best = pb[category.key];
    const courseRecord = getCourseRecordForDistance(run.distance, run.time, category.distance);

    return best
      && courseRecord
      && Math.abs(courseRecord.time - best.time) < 0.01;
  });
}

function hasRecentPersonalBest(runs, days) {
  const startDate = getDateDaysAgo(days - 1);
  const endDate = getDateDaysAgo(0);
  endDate.setHours(23, 59, 59, 999);

  return filterRunsBetween(runs, startDate, endDate).some((run) => getPersonalBestCategoriesForRun(run).length > 0);
}

function updatePbCelebration(runs) {
  const pbCelebration = document.getElementById("pbCelebration");

  if (!pbCelebration) return;

  const startDate = getDateDaysAgo(29);
  const endDate = getDateDaysAgo(0);
  endDate.setHours(23, 59, 59, 999);
  const recentPbRuns = filterRunsBetween(runs, startDate, endDate)
    .map((run) => ({
      run,
      categories: getPersonalBestCategoriesForRun(run)
    }))
    .filter((entry) => entry.categories.length > 0)
    .sort((a, b) => (b.run.runDate || "").localeCompare(a.run.runDate || ""));

  if (!recentPbRuns.length) {
    pbCelebration.classList.add("hidden");
    pbCelebration.innerText = "";
    return;
  }

  const latest = recentPbRuns[0];
  const categoryLabels = latest.categories.map((category) => category.label).join(", ");
  const firstCategory = latest.categories[0];
  const best = pb[firstCategory.key];
  const sourceText = best?.isAdjusted
    ? `, 원기록 ${best.originalDistance}km ${formatTime(best.originalTime)}`
    : "";
  pbCelebration.innerText = `${categoryLabels} PB 갱신! ${latest.run.runDate} ${firstCategory.label} 기록 ${formatTime(best.time)} (${formatPace(best.pace)}${sourceText})으로 좋은 흐름입니다.`;
  pbCelebration.classList.remove("hidden");
}

function getPeriodRangeText(period) {
  const startDate = getPeriodStartDate(period);
  const endDate = new Date();

  if (!startDate) return "전체";

  return `${formatChartDate(dateToInputValue(startDate))}~${formatChartDate(dateToInputValue(endDate))}`;
}

function updatePersonalBest(distance, time, sourceRun = {}) {
  PB_CATEGORIES.forEach((category) => {
    const courseRecord = getCourseRecordForDistance(distance, time, category.distance);

    if (!courseRecord) return;

    if (!pb[category.key] || courseRecord.time < pb[category.key].time) {
      pb[category.key] = {
        ...courseRecord,
        sourceRunId: sourceRun.id || "",
        runDate: sourceRun.runDate || "",
        type: sourceRun.type || "training",
        raceName: sourceRun.raceName || ""
      };
    }
  });
}

function updatePersonalBestView() {
  document.getElementById("pb5k").innerText =
    pb["5K"] ? `${formatTime(pb["5K"].time)} (${formatPace(pb["5K"].pace)})` : "-";

  document.getElementById("pb10k").innerText =
    pb["10K"] ? `${formatTime(pb["10K"].time)} (${formatPace(pb["10K"].pace)})` : "-";

  document.getElementById("pbHalf").innerText =
    pb["HALF"] ? `${formatTime(pb["HALF"].time)} (${formatPace(pb["HALF"].pace)})` : "-";

  document.getElementById("pbFull").innerText =
    pb["FULL"] ? `${formatTime(pb["FULL"].time)} (${formatPace(pb["FULL"].pace)})` : "-";
}

async function loadClubRanking(user) {
  const requestId = ++rankingLoadId;
  const rankingList = document.getElementById("rankingList");
  const rankingStatus = document.getElementById("rankingStatus");
  const rankingDistance = document.getElementById("rankingDistance");
  const rankingType = document.getElementById("rankingType");
  const rankingTypeColumns = document.querySelectorAll(".ranking-type-col");
  const rankingAdminColumns = document.querySelectorAll(".ranking-admin-col");

  if (!rankingList || !rankingStatus || !rankingDistance || !rankingType) return;

  rankingList.innerHTML = "";
  rankingTypeColumns.forEach((column) => {
    column.classList.toggle("hidden", rankingType.value === "race");
  });
  rankingAdminColumns.forEach((column) => {
    column.classList.toggle("hidden", !isHostUser(user));
  });

  if (!user) {
    rankingStatus.innerText = "로그인 후 나빌러닝 PB 랭킹을 확인할 수 있습니다.";
    return;
  }

  rankingStatus.innerText = "랭킹을 불러오는 중입니다...";

  try {
    const selectedDistance = Number(rankingDistance.value);
    const onlyRace = rankingType.value === "race";
    const rankingsByUser = new Map();
    const profileNames = await loadUserProfileNames();

    if (requestId !== rankingLoadId) return;

    const querySnapshot = await getDocsFromServer(collection(db, "runs"));

    if (requestId !== rankingLoadId) return;

    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      const distance = Number(data.distance);
      const time = Number(data.time);
      const courseRecord = getCourseRecordForDistance(distance, time, selectedDistance);

      if (!Number.isFinite(distance) || !Number.isFinite(time)) return;
      if (!courseRecord) return;
      if (onlyRace && data.type !== "race") return;
      if (data.rankingEligible === false) return;

      const userId = data.userId || data.email;
      const existing = rankingsByUser.get(userId);
      const runDate = getSavedRunDate(data);
      const entry = {
        id: snapshotDoc.id,
        userId,
        name: getRankingName(data, profileNames),
        email: data.email || "",
        distance: selectedDistance,
        time: courseRecord.time,
        pace: courseRecord.pace,
        originalDistance: distance,
        originalTime: time,
        isAdjusted: courseRecord.isAdjusted,
        runDate,
        raceName: data.raceName || "",
        type: data.type === "race" ? "대회" : "훈련"
      };

      if (!existing || entry.time < existing.time) {
        rankingsByUser.set(userId, entry);
      }
    });

    const rankings = Array.from(rankingsByUser.values()).sort((a, b) => a.time - b.time);

    rankingList.innerHTML = "";

    if (rankings.length === 0) {
      rankingStatus.innerText = "아직 조건에 맞는 기록이 없습니다.";
      return;
    }

    rankings.forEach((entry, index) => {
      const tr = document.createElement("tr");
      const isMe = entry.userId === user.uid || entry.email === user.email;

      if (isMe) {
        tr.classList.add("my-rank");
      }

      const cells = [
        `${index + 1}${isMe ? " (나)" : ""}`,
        entry.name,
        entry.isAdjusted
          ? `${formatTime(entry.time)} (${entry.originalDistance}km 기준)`
          : formatTime(entry.time),
        formatPace(entry.pace),
        entry.runDate || "-",
        entry.type === "대회" ? entry.raceName || "-" : "-"
      ];

      if (!onlyRace) {
        cells.push(entry.type);
      }

      cells.forEach((value) => {
        const td = document.createElement("td");
        td.innerText = value;
        tr.appendChild(td);
      });

      if (isHostUser(user)) {
        const actionTd = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "button-danger table-action";
        deleteBtn.innerText = "기록 삭제";
        deleteBtn.addEventListener("click", () => {
          deleteRankingRecord(entry);
        });
        actionTd.appendChild(deleteBtn);
        tr.appendChild(actionTd);
      }

      rankingList.appendChild(tr);
    });

    const myRankIndex = rankings.findIndex((entry) => entry.userId === user.uid || entry.email === user.email);
    const distanceLabel = getDistanceLabel(selectedDistance);
    const typeLabel = onlyRace ? "대회 기록" : "전체 기록";

    if (myRankIndex >= 0) {
      const percentile = Math.round(((myRankIndex + 1) / rankings.length) * 100);
      rankingStatus.innerText = `${distanceLabel} ${typeLabel} 기준 내 순위: ${myRankIndex + 1}위 / ${rankings.length}명, 상위 ${percentile}%`;
    } else {
      rankingStatus.innerText = `${distanceLabel} ${typeLabel} 기준 랭킹입니다. 아직 내 기록은 없습니다.`;
    }
  } catch (e) {
    console.error(e);
    rankingStatus.innerText = "나빌러닝 PB 랭킹을 불러오지 못했습니다. Firestore 보안 규칙에서 전체 기록 읽기가 허용되어 있는지 확인해주세요.";
  }
}

async function loadWeeklyRanking(user) {
  const weeklyRankingList = document.getElementById("weeklyRankingList");
  const weeklyRankingStatus = document.getElementById("weeklyRankingStatus");

  if (!weeklyRankingList || !weeklyRankingStatus) return;

  weeklyRankingList.innerHTML = "";

  if (!user) {
    weeklyRankingStatus.innerText = "로그인 후 주간 챌린지 랭킹을 확인할 수 있습니다.";
    return;
  }

  weeklyRankingStatus.innerText = "주간 챌린지 랭킹을 불러오는 중입니다...";

  try {
    const profileNames = await loadUserProfileNames();
    const querySnapshot = await getDocsFromServer(collection(db, "runs"));
    const startDate = getPeriodStartDate("week");
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const rankingsByUser = new Map();

    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      const distance = Number(data.distance);
      const time = Number(data.time);
      const runDate = getSavedRunDate(data);
      const runDateKey = getDateKey(runDate);
      const parsedRunDate = parseInputDate(runDate);

      if (!Number.isFinite(distance) || !Number.isFinite(time) || !parsedRunDate || !runDateKey) return;
      if (parsedRunDate < startDate || parsedRunDate > endDate) return;

      const userId = data.userId || data.email || snapshotDoc.id;
      const entry = rankingsByUser.get(userId) || {
        userId,
        email: data.email || "",
        name: getRankingName(data, profileNames),
        totalDistance: 0,
        totalTime: 0,
        runDates: new Set()
      };

      entry.totalDistance += distance;
      entry.totalTime += time;
      entry.runDates.add(runDateKey);
      rankingsByUser.set(userId, entry);
    });

    const rankings = Array.from(rankingsByUser.values())
      .map((entry) => ({
        ...entry,
        count: entry.runDates.size,
        averagePace: entry.totalDistance ? entry.totalTime / entry.totalDistance : 0
      }))
      .sort((a, b) => {
        if (b.totalDistance !== a.totalDistance) return b.totalDistance - a.totalDistance;
        if (b.count !== a.count) return b.count - a.count;
        return a.averagePace - b.averagePace;
      });

    if (!rankings.length) {
      weeklyRankingStatus.innerText = "최근 7일 주간 챌린지 기록이 아직 없습니다.";
      return;
    }

    rankings.slice(0, 10).forEach((entry, index) => {
      const tr = document.createElement("tr");
      const isMe = entry.userId === user.uid || entry.email === user.email;

      if (isMe) {
        tr.classList.add("my-rank");
      }

      [
        `${index + 1}${isMe ? " (나)" : ""}`,
        entry.name,
        formatMileage(entry.totalDistance),
        `${entry.count}일`,
        entry.averagePace ? formatPace(entry.averagePace) : "-"
      ].forEach((value) => {
        const td = document.createElement("td");
        td.innerText = value;
        tr.appendChild(td);
      });

      weeklyRankingList.appendChild(tr);
    });

    const myRankIndex = rankings.findIndex((entry) => entry.userId === user.uid || entry.email === user.email);

    if (myRankIndex >= 0) {
      const myEntry = rankings[myRankIndex];
      weeklyRankingStatus.innerText = `내 주간 순위: ${myRankIndex + 1}위 / ${rankings.length}명, ${formatMileage(myEntry.totalDistance)} · ${myEntry.count}일 출석`;
    } else {
      weeklyRankingStatus.innerText = `최근 7일 기준 ${rankings.length}명이 챌린지에 참여 중입니다. 이번 주 첫 기록을 남겨보세요.`;
    }
  } catch (e) {
    console.error(e);
    weeklyRankingStatus.innerText = "주간 챌린지 랭킹을 불러오지 못했습니다. Firestore 보안 규칙에서 전체 기록 읽기가 허용되어 있는지 확인해주세요.";
  }
}

function isSameDistanceCategory(distance, selectedDistance) {
  const tolerance = getDistanceCategoryTolerance(selectedDistance);
  return Math.abs(distance - selectedDistance) <= tolerance;
}

function getDistanceCategoryTolerance(selectedDistance) {
  return selectedDistance >= 42 ? 2 : selectedDistance >= 21 ? 1 : 0.5;
}

function getCourseRecordForDistance(distance, time, targetDistance) {
  const tolerance = getDistanceCategoryTolerance(targetDistance);

  if (!Number.isFinite(distance) || !Number.isFinite(time) || !Number.isFinite(targetDistance)) {
    return null;
  }

  if (distance <= 0 || time <= 0 || targetDistance <= 0) {
    return null;
  }

  if (distance + 0.001 < targetDistance) {
    return null;
  }

  if (distance - targetDistance > tolerance) {
    return null;
  }

  const courseTime = time * (targetDistance / distance);

  return {
    distance: targetDistance,
    time: courseTime,
    pace: courseTime / targetDistance,
    originalDistance: distance,
    originalTime: time,
    isAdjusted: Math.abs(distance - targetDistance) > 0.001
  };
}

function getDistanceLabel(distance) {
  if (Math.abs(distance - 5) < 0.5) return "5K";
  if (Math.abs(distance - 10) < 0.5) return "10K";
  if (Math.abs(distance - 21.097) < 1) return "Half";
  if (Math.abs(distance - 42.195) < 2) return "Full";
  return `${distance}km`;
}

function clearDashboard() {
  latestRuns = [];
  latestSuggestions = [];
  monthlyGoalKm = 0;
  monthlyGoalLocked = false;
  visibleRunCount = INITIAL_VISIBLE_RUN_COUNT;
  resetPersonalBest();
  document.getElementById("runList").innerHTML = "";
  document.getElementById("recordListStatus").innerText = "로그인 후 운동 기록을 확인할 수 있습니다.";
  document.getElementById("loadMoreRuns").classList.add("hidden");
  document.getElementById("recordPeriod").value = "all";
  document.getElementById("recordType").value = "all";
  document.getElementById("recordDistance").value = "all";
  document.getElementById("periodStats").innerHTML = "";
  document.getElementById("mileageSummary").innerText = `${getMileageSummaryPrefix()} 마일리지\n주간: -, 월간: -, 연간: -`;
  document.getElementById("weeklyInsight").innerText = "기록을 남기면 이번 주 흐름을 편하게 짚어드릴게요.";
  document.getElementById("weeklyBadges").innerHTML = '<span class="run-badge run-badge-waiting"><span class="run-badge-icon">✨</span><span class="run-badge-text">기록 대기 중</span></span>';
  document.getElementById("dailyRecommendation").innerText = "오늘 몸에 맞는 러닝을 살짝 골라드릴게요.";
  document.getElementById("monthlyGoal").value = "";
  document.getElementById("monthlyGoal").disabled = false;
  document.getElementById("saveMonthlyGoal").disabled = false;
  document.getElementById("saveMonthlyGoal").innerText = "목표 저장";
  document.getElementById("monthlyGoalStatus").innerText = "목표 입력 전";
  document.getElementById("monthlyGoalStatus").classList.remove("goal-star");
  document.getElementById("rankingList").innerHTML = "";
  document.getElementById("rankingStatus").innerText = "";
  document.getElementById("weeklyRankingList").innerHTML = "";
  document.getElementById("weeklyRankingStatus").innerText = "로그인 후 주간 챌린지 랭킹을 확인할 수 있습니다.";
  document.getElementById("qualityRunList").innerHTML = "";
  document.getElementById("qualityStatus").innerText = "로그인 후 정훈 결과를 확인할 수 있습니다.";
  renderVdotTrainingGuide();
  runningGroupStandards = DEFAULT_RUNNING_GROUP_STANDARDS.map((standard) => ({ ...standard }));
  renderRunningGroupStandards(null);
  renderQualityMonthlyPlan();
  document.getElementById("suggestionType").value = "error";
  document.getElementById("suggestionTitle").value = "";
  document.getElementById("suggestionContent").value = "";
  document.getElementById("suggestionList").innerHTML = "";
  document.getElementById("suggestionStatus").innerText = "로그인 후 제안 목록을 확인할 수 있습니다.";
  document.getElementById("pbCelebration").innerText = "";
  document.getElementById("pbCelebration").classList.add("hidden");
  document.getElementById("marathonPrediction").innerText = "-";
  document.getElementById("targetResult").innerHTML = "";
  document.getElementById("targetResult").classList.add("hidden");
  clearMemberRunsPanel();
  resetRunForm();
  resetQualityForm();
  updatePersonalBestView();
  drawChart([]);
}

function updateMarathonPrediction() {
  const basis = getMarathonPredictionBasis();
  const predictionDiv = document.getElementById("marathonPrediction");
  const vdotPaces = getVdotTrainingPaces();

  if (!basis) {
    predictionDiv.innerText = "데이터가 부족합니다";
    return;
  }

  const mileageDetail = getMileageAdjustmentText(basis.mileageAdjustment);
  const assignedGroup = getRunningGroup(basis.predictedTime);
  const memberGroup = getRunningGroupByMemberName(getUserName(auth.currentUser));

  if (!assignedGroup) {
    predictionDiv.innerHTML = [
      '<div class="target-block">',
      `<b>예상 마라톤 기록</b><span class="prediction-time">${formatTime(basis.predictedTime)}</span>`,
      `<span class="prediction-detail">${basis.label}<br>${mileageDetail}</span>`,
      '</div>',
      '<div class="target-block">',
      '<b>나빌러닝 예상조</b><br>현재 기준표의 Sub 5:00보다 여유가 필요합니다.<br>예상조는 최근 기록과 훈련량으로 계산한 임시 참고값이라 실제 조편성과 다를 수 있습니다.',
      '</div>'
    ].join("");
    return;
  }

  const comparison = compareWithGroupTarget(basis.predictedTime, assignedGroup);
  const groupEncouragement = getGroupEncouragementMessage(basis.predictedTime, assignedGroup, basis.mileageAdjustment);
  const groupTrendMessage = getGroupTrendMessage(assignedGroup, memberGroup);
  const vdotBlock = vdotPaces
    ? [
        '<div class="target-block">',
        `<b>VDOT 참고 훈련 페이스</b><br>VDOT ${Math.round(vdotPaces.vdot)} (${vdotPaces.basis.label} 기준)<br>E ${vdotPaces.easy}<br>T ${vdotPaces.threshold}<br>I ${vdotPaces.interval}<br>R ${vdotPaces.repetition}`,
        '</div>'
      ].join("")
    : "";

  predictionDiv.innerHTML = [
    '<div class="target-block">',
    `<b>예상 마라톤 기록</b><span class="prediction-time">${formatTime(basis.predictedTime)}</span>`,
    `<span class="prediction-detail">${basis.label}<br>${mileageDetail}</span>`,
    '</div>',
    '<div class="target-block">',
    `<b>나빌러닝 예상조</b><br><span class="group-badge">${assignedGroup.group}조</span> ${assignedGroup.targetLabel} 기준 / ${comparison}<br>${groupTrendMessage}<br>${groupEncouragement}`,
    '</div>',
    '<div class="target-block">',
    `<b>적정 훈련 기준</b><br>인터벌 페이스: ${assignedGroup.intervalPace}<br>리커버리 조깅 페이스: ${assignedGroup.recoveryPace}<br>월간 마일리지: ${assignedGroup.monthlyMileage}`,
    '</div>',
    vdotBlock
  ].join("");
}

function predictMarathon(time, distance) {
  const marathonDistance = 42.195;
  return time * Math.pow(marathonDistance / distance, 1.06);
}

function getMarathonPredictionBasis() {
  const sources = getMarathonPredictionSources();

  if (!sources.length) return null;

  const totalWeight = sources.reduce((total, source) => total + source.weight, 0);
  const basePredictedTime = sources.reduce((total, source) => {
    return total + (source.predictedTime * source.weight);
  }, 0) / totalWeight;
  const mileageAdjustment = getMarathonMileageAdjustment(latestRuns);
  const predictedTime = basePredictedTime * mileageAdjustment.factor;
  const label = "[예측 기록 참고용 데이터]";

  return {
    label,
    basePredictedTime,
    predictedTime,
    mileageAdjustment,
    sources
  };
}

function getMarathonMileageAdjustment(runs) {
  const recentMileage = sumMileageByPeriod(runs, "month");

  if (recentMileage >= 280) {
    return { recentMileage, factor: 0.97, label: "마라톤 준비 마일리지 충분" };
  }

  if (recentMileage >= 200) {
    return { recentMileage, factor: 0.985, label: "마일리지 흐름 좋음" };
  }

  if (recentMileage >= 120) {
    return { recentMileage, factor: 1, label: "기본 마일리지 반영" };
  }

  if (recentMileage >= 80) {
    return { recentMileage, factor: 1.02, label: "마일리지 보완 필요" };
  }

  if (recentMileage >= 40) {
    return { recentMileage, factor: 1.05, label: "지구력 보완 필요" };
  }

  return { recentMileage, factor: 1.08, label: "최근 마일리지 부족" };
}

function getMileageAdjustmentText(adjustment) {
  if (!adjustment) return "";

  const percent = Math.round(Math.abs(adjustment.factor - 1) * 1000) / 10;
  let adjustmentText = "기록 예측 유지";

  if (adjustment.factor < 1) {
    adjustmentText = `${percent}% 단축 보정`;
  }

  if (adjustment.factor > 1) {
    adjustmentText = `${percent}% 여유 보정`;
  }

  return `최근 훈련량과 기록 흐름을 함께 참고한 예측입니다. 최근 30일 마일리지 ${formatMileage(adjustment.recentMileage)}도 반영되었습니다.`;
}

function getMarathonPredictionSources() {
  const sourceDefinitions = [
    { key: "FULL", label: "풀코스 PB", distance: 42.195, weight: 4 },
    { key: "HALF", label: "하프 PB", distance: 21.097, weight: 3 },
    { key: "10K", label: "10K PB", distance: 10, weight: 2 },
    { key: "5K", label: "5K PB", distance: 5, weight: 1 }
  ];

  return sourceDefinitions
    .filter((source) => pb[source.key])
    .map((source) => {
      const record = pb[source.key];
      const predictedTime = source.key === "FULL"
        ? record.time
        : predictMarathon(record.time, source.distance);

      return {
        ...source,
        recordTime: record.time,
        predictedTime
      };
    });
}

function getRunningGroup(predictedTime) {
  for (let index = 0; index < runningGroupStandards.length; index += 1) {
    const standard = runningGroupStandards[index];

    if (predictedTime <= standard.targetMinutes) {
      return runningGroupStandards[Math.max(index - 1, 0)];
    }
  }

  return runningGroupStandards[runningGroupStandards.length - 1];
}

function getRunningGroupIndex(group) {
  if (!group?.group) return -1;

  return runningGroupStandards.findIndex((standard) => standard.group === group.group);
}

function getGroupTrendMessage(predictedGroup, memberGroup) {
  const baseNotice = "예상조는 최근 기록과 훈련량으로 계산한 임시 참고값이라 실제 조편성과 다를 수 있습니다.";

  if (!memberGroup) {
    return `${baseNotice} 조별 명단에 이름이 없으면 예상 기록 기준으로만 안내됩니다.`;
  }

  const predictedIndex = getRunningGroupIndex(predictedGroup);
  const memberIndex = getRunningGroupIndex(memberGroup);
  const actualGroupText = `현재 실제 조편성은 ${memberGroup.group}조입니다.`;

  if (predictedIndex < 0 || memberIndex < 0) {
    return `${baseNotice} ${actualGroupText}`;
  }

  if (predictedIndex < memberIndex) {
    return `${baseNotice} ${actualGroupText} 예상조가 실제 조보다 높게 나왔어요. 최근 흐름이 성장 쪽으로 움직이고 있다는 좋은 신호입니다.`;
  }

  if (predictedIndex > memberIndex) {
    return `${baseNotice} ${actualGroupText} 예상조가 실제 조보다 낮게 나왔어요. 최근 훈련량이나 기록 흐름이 잠시 부족했을 수 있으니, 다시 차근차근 쌓아보면 좋겠습니다.`;
  }

  return `${baseNotice} ${actualGroupText} 예상조와 실제 조가 같은 흐름입니다.`;
}

function compareWithGroupTarget(predictedTime, group) {
  const diff = group.targetMinutes - predictedTime;

  if (Math.abs(diff) < 0.01) {
    return `${group.targetLabel} 목표와 거의 같습니다.`;
  }

  if (diff > 0) {
    return `${group.targetLabel}보다 ${formatTime(diff)} 빠른 예상입니다.`;
  }

  return `${group.targetLabel}까지 ${formatTime(Math.abs(diff))} 단축이 필요합니다.`;
}

function getGroupEncouragementMessage(predictedTime, group, mileageAdjustment) {
  const diff = predictedTime - group.targetMinutes;
  const recentMileage = mileageAdjustment?.recentMileage || 0;

  if (diff <= -5) {
    return "현재 흐름은 목표보다 여유가 있습니다. 무리하게 더 당기기보다 컨디션 관리와 부상 방지에 집중하면 좋은 레이스로 이어질 수 있습니다.";
  }

  if (Math.abs(diff) <= 5) {
    return "목표권에 아주 가까이 와 있습니다. 앞으로는 큰 변화보다 꾸준한 마일리지와 회복 리듬을 지키는 것이 가장 중요합니다.";
  }

  if (diff <= 15) {
    return "조금만 더 다듬으면 목표권에 들어올 수 있습니다. 인터벌보다 지속주와 롱런을 안정적으로 쌓아 후반 유지력을 키워보세요.";
  }

  if (recentMileage < 80) {
    return "현재는 기록보다 기초 마일리지를 먼저 쌓는 시기입니다. 짧고 편한 조깅을 꾸준히 반복하면 예상 기록은 자연스럽게 좋아질 수 있습니다.";
  }

  if (recentMileage < 120) {
    return "속도보다 지구력 기반을 조금 더 넓히면 좋겠습니다. 주 3회 러닝과 주말 롱런을 차분히 이어가면 목표와의 거리가 줄어듭니다.";
  }

  return "이미 훈련 흐름은 만들어지고 있습니다. 부족한 부분은 한 번에 메우기보다 몇 주에 걸쳐 속도와 지구력을 균형 있게 올려보세요.";
}

function reverseRiegel(targetTime, distance) {
  const marathonDistance = 42.195;
  return targetTime / Math.pow(marathonDistance / distance, 1.06);
}

function compareRecord(current, target) {
  if (!current) return "기록 데이터가 없습니다";

  const diff = current - target;

  if (diff <= 0) {
    return "현재 기록으로 목표 달성이 가능합니다";
  }

  return `${formatTime(diff)} 단축이 필요합니다`;
}

function getTargetRecordRows(targetTime, required5K, required10K, requiredHalf) {
  return [
    { key: "5K", label: "5K", distance: 5, current: pb["5K"]?.time, target: required5K },
    { key: "10K", label: "10K", distance: 10, current: pb["10K"]?.time, target: required10K },
    { key: "HALF", label: "하프", distance: 21.097, current: pb["HALF"]?.time, target: requiredHalf },
    { key: "FULL", label: "풀코스", distance: 42.195, current: pb["FULL"]?.time, target: targetTime }
  ];
}

function getRecordComparisonText(row) {
  if (!row.current) {
    return getFriendlyMessage([
      `${row.label} 기준 기록이 아직 없어서 이 구간은 판단을 보류할게요.`,
      `${row.label} 기록을 하나 남기면 목표 분석이 더 선명해집니다.`,
      `${row.label} 데이터가 비어 있어요. 다음 기록이 들어오면 페이서가 바로 다시 계산할게요.`
    ], `target-missing-${row.key}`);
  }

  const diff = row.current - row.target;

  if (diff <= 0) {
    return getFriendlyMessage([
      `현재 기록이 필요 기준보다 ${formatTime(Math.abs(diff))} 여유 있습니다.`,
      `${row.label} 기록은 목표 페이스를 받쳐주는 좋은 근거입니다.`,
      `이 구간은 이미 목표권입니다. 무리하게 더 당기기보다 안정성을 지켜주세요.`
    ], `target-ready-${row.key}-${Math.round(Math.abs(diff) * 10)}`);
  }

  return getFriendlyMessage([
    `필요 기준까지 ${formatTime(diff)} 단축이 필요합니다.`,
    `${row.label}에서 ${formatTime(diff)}만 줄이면 목표 계산이 훨씬 좋아집니다.`,
    `아직 ${formatTime(diff)} 정도 간격이 있어요. 이 구간을 훈련 포인트로 잡으면 좋겠습니다.`
  ], `target-gap-${row.key}-${Math.round(diff * 10)}`);
}

function getTargetAnalysisSummary(rows, targetTime) {
  const recordedRows = rows.filter((row) => row.current);

  if (!recordedRows.length) {
    return getFriendlyMessage([
      "아직 기준 기록이 부족합니다. 5K나 10K부터 하나 남기면 목표가 훨씬 또렷해집니다.",
      "지금은 목표를 정교하게 판단하기보다 기록의 첫 기준점을 만드는 단계입니다.",
      "기록이 쌓이면 페이서가 속도형인지 지구력형인지 더 정확히 짚어드릴게요."
    ], `target-summary-empty-${targetTime}`);
  }

  const readyRows = recordedRows.filter((row) => row.current <= row.target);
  const gapRows = recordedRows
    .filter((row) => row.current > row.target)
    .sort((a, b) => (b.current - b.target) - (a.current - a.target));
  const strongest = readyRows
    .slice()
    .sort((a, b) => (a.current - a.target) - (b.current - b.target))[0];
  const weakest = gapRows[0];

  if (readyRows.length === recordedRows.length) {
    return getFriendlyMessage([
      `저장된 기록은 전반적으로 목표권입니다. 특히 ${strongest.label} 기록이 좋은 근거가 됩니다.`,
      `현재 기록 흐름만 보면 목표 페이스를 감당할 기본기는 있습니다. 이제는 레이스 운영과 후반 유지가 핵심입니다.`,
      `속도 기준은 잘 맞아 있습니다. 남은 훈련은 무리한 상승보다 컨디션을 오래 지키는 쪽이 좋습니다.`
    ], `target-summary-ready-${targetTime}-${readyRows.length}`);
  }

  if (readyRows.length > 0 && weakest) {
    return getFriendlyMessage([
      `${strongest.label}는 강점이고 ${weakest.label}는 보완 포인트입니다. 강점은 유지하고 약한 구간을 차분히 채워가면 됩니다.`,
      `목표에 닿는 기록과 부족한 기록이 섞여 있어요. 지금은 한 방의 훈련보다 꾸준한 반복이 더 크게 작용합니다.`,
      `${weakest.label} 기준에서 간격이 가장 큽니다. 다음 몇 주는 그 구간을 좁히는 훈련으로 잡아보세요.`
    ], `target-summary-mixed-${targetTime}-${weakest.key}`);
  }

  return getFriendlyMessage([
    `${weakest.label} 기준 간격이 가장 큽니다. 목표는 유지하되 중간 목표를 하나 두면 훈련이 안정됩니다.`,
    "저장된 기록 기준으로는 아직 목표가 공격적입니다. 속도보다 먼저 반복 가능한 주간 루틴을 만드는 게 좋겠습니다.",
    "목표까지 거리가 있지만 방향은 잡을 수 있습니다. 지금은 기록 욕심보다 마일리지와 회복 리듬이 우선입니다."
  ], `target-summary-gap-${targetTime}-${weakest?.key || "all"}`);
}

function createTargetAnalysisHtml(targetTime, required5K, required10K, requiredHalf) {
  const rows = getTargetRecordRows(targetTime, required5K, required10K, requiredHalf);
  const visibleRows = rows.filter((row) => row.key !== "FULL");
  const rowHtml = visibleRows.map((row) => {
    return [
      `<span class="target-metric">${row.label} 필요 기록: ${formatTime(row.target)} (${formatPace(row.target / row.distance)})</span><br>`,
      getRecordComparisonText(row)
    ].join("");
  }).join("<br><br>");

  return [
    rowHtml,
    "<br><br>",
    `<span class="target-metric">페이서 요약</span><br>${getTargetAnalysisSummary(rows, targetTime)}`
  ].join("");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function analyzeGoalProbability(targetTime) {
  const basis = getMarathonPredictionBasis();

  if (!basis) {
    return [
      "분석할 기준 기록이 아직 부족합니다.",
      "5K, 10K, 하프, 풀코스 중 하나의 기록을 저장하면 페이서가 목표 달성 확률을 계산해드릴게요."
    ].join("\n");
  }

  const diff = basis.predictedTime - targetTime;
  const diffRate = diff / targetTime;
  const recentMileage = basis.mileageAdjustment?.recentMileage || 0;
  let probability;
  let comment;

  if (diff <= 0) {
    probability = clamp(Math.round(82 + Math.abs(diffRate) * 180), 82, 95);
    comment = getFriendlyMessage([
      "현재 기록 흐름으로는 목표 달성 가능성이 좋아 보여요. 레이스 당일 컨디션과 보급 전략까지 챙기면 더 안정적입니다.",
      "기록 기준은 목표 안쪽에 있습니다. 이제 남은 변수는 오버페이스를 참는 운영과 후반 보급입니다.",
      "목표권에 들어온 상태입니다. 더 강하게 밀기보다 몸 상태를 일정하게 유지하는 것이 성공 확률을 높입니다."
    ], `goal-prob-ready-${targetTime}-${Math.round(recentMileage)}`);
  } else {
    probability = clamp(Math.round(80 - diffRate * 500), 10, 78);

    if (probability >= 60) {
      comment = getFriendlyMessage([
        "목표에 가까운 편입니다. 몇 주 동안 핵심 훈련을 꾸준히 가져가면 충분히 도전권에 들어올 수 있어요.",
        "간격은 크지 않습니다. 화요 정훈과 주말 롱런을 끊기지 않게 이어가면 확률이 올라갑니다.",
        "지금은 마지막 한 끗을 만드는 구간입니다. 강도보다 반복성과 회복을 같이 챙겨주세요."
      ], `goal-prob-close-${targetTime}-${Math.round(diff * 10)}`);
    } else if (probability >= 35) {
      comment = getFriendlyMessage([
        "아직은 조금 여유가 필요합니다. 무리하게 당기기보다 속도와 지구력을 차근차근 쌓는 쪽이 좋습니다.",
        "도전은 가능하지만 준비 구간이 더 필요합니다. 기록 욕심보다 꾸준한 주간 마일리지가 먼저입니다.",
        "목표까지 중간 간격이 있습니다. 10K 리듬과 하프 이후 버티는 힘을 함께 키워야 합니다."
      ], `goal-prob-mid-${targetTime}-${Math.round(diff * 10)}`);
    } else {
      comment = getFriendlyMessage([
        "현재 기록 기준으로는 목표가 꽤 공격적입니다. 목표를 유지하되 중간 목표를 하나 더 두면 훈련이 안정적이에요.",
        "지금 목표는 도전성이 높습니다. 먼저 완주 안정성과 후반 페이스 유지력을 만드는 쪽이 좋겠습니다.",
        "목표를 바로 당기기보다 단계 목표를 두는 편이 안전합니다. 훈련이 쌓이면 확률은 다시 올라갑니다."
      ], `goal-prob-far-${targetTime}-${Math.round(diff * 10)}`);
    }
  }

  const gapText = diff <= 0
    ? `목표보다 ${formatTime(Math.abs(diff))} 빠른 수준입니다.`
    : `목표보다 ${formatTime(diff)} 단축이 필요합니다.`;
  const probabilityLabel = probability >= 80 ? "높음" : probability >= 60 ? "도전권" : probability >= 35 ? "준비 필요" : "장기 준비";

  return [
    `예상 확률: ${probability}% (${probabilityLabel})`,
    `분석 기준: ${basis.label}`,
    `기준 예상 기록: ${formatTime(basis.predictedTime)}`,
    getMileageAdjustmentText(basis.mileageAdjustment),
    gapText,
    comment
  ].join("\n");
}

function getTrainingFocusData(pb, targetTime, required10K, requiredHalf) {
  const has10K = Boolean(pb["10K"]);
  const hasHalf = Boolean(pb["HALF"]);
  const needSpeed = has10K && pb["10K"].time > required10K;
  const needEndurance = hasHalf && pb["HALF"].time > requiredHalf;
  const basis = getMarathonPredictionBasis();
  const recentMileage = basis?.mileageAdjustment?.recentMileage || 0;
  const weekStats = calculateRunStats(filterRunsByPeriod(latestRuns, "week"));
  const predictionGap = basis ? basis.predictedTime - targetTime : null;

  return {
    has10K,
    hasHalf,
    needSpeed,
    needEndurance,
    basis,
    recentMileage,
    weekStats,
    predictionGap,
    speedGap: has10K ? pb["10K"].time - required10K : null,
    enduranceGap: hasHalf ? pb["HALF"].time - requiredHalf : null
  };
}

function recommendTraining(pb, targetTime, required10K, requiredHalf) {
  const focus = getTrainingFocusData(pb, targetTime, required10K, requiredHalf);
  const officialTrainingComment = getOfficialTrainingCommentText(getMarathonPredictionBasis()?.predictedTime);
  const mileageText = `최근 30일 마일리지는 ${formatMileage(focus.recentMileage)}입니다.`;
  const weekText = focus.weekStats.count
    ? `이번 주는 ${focus.weekStats.count}회, ${formatMileage(focus.weekStats.totalDistance)}를 쌓았습니다.`
    : "이번 주 기록은 아직 적습니다.";

  if (!focus.has10K && !focus.hasHalf) {
    return [
      getFriendlyMessage([
        "아직 목표를 판단할 기준 기록이 조금 부족해요.",
        "지금은 목표 기록을 세밀하게 당기기보다 기준 기록을 만드는 단계입니다.",
        "페이서가 가장 먼저 보고 싶은 건 10K나 하프에서의 현재 리듬입니다."
      ], `coach-missing-${targetTime}`),
      "먼저 10K나 하프 기록을 하나 남겨주면 목표 분석이 훨씬 정확해집니다.",
      `${mileageText} ${weekText}`,
      `${officialTrainingComment} 기록을 억지로 재기보다 몸 상태에 맞춰 반복을 안정적으로 가져가세요.`,
      "좋은 훈련은 지금 내 몸을 아는 것에서 시작됩니다."
    ].join("\n");
  }

  if (focus.needSpeed && focus.needEndurance) {
    return [
      getFriendlyMessage([
        "목표 기록까지 가려면 속도와 지구력을 함께 키워야 해요.",
        "10K와 하프 기준이 모두 조금 부족합니다. 빠르게 달리는 힘과 오래 버티는 힘을 같이 올려야 합니다.",
        "지금은 특정 한 구간보다 전체 러닝 체력을 다시 넓히는 게 핵심입니다."
      ], `coach-both-${targetTime}-${Math.round(focus.speedGap * 10)}-${Math.round(focus.enduranceGap * 10)}`),
      `10K는 약 ${formatTime(focus.speedGap)} 단축, 하프는 약 ${formatTime(focus.enduranceGap)} 단축이 필요합니다. ${mileageText}`,
      "이번 주 핵심은 화요일 나빌러닝 정훈의 인터벌입니다. 빠른 한 번보다 마지막 반복까지 차분하게 페이스를 지켜보세요.",
      "주말 롱런은 욕심내서 빠르게 뛰기보다 오래 안정적으로 버티는 쪽이 더 좋습니다.",
      "잘 쉬는 것도 훈련입니다. 페이서는 그 균형을 더 중요하게 볼게요."
    ].join("\n");
  }

  if (focus.needSpeed) {
    return [
      getFriendlyMessage([
        "10K 기록을 보면 목표 마라톤 페이스에 필요한 스피드 여유를 조금 더 만들어두면 좋겠어요.",
        "지구력보다 스피드 쪽 간격이 더 눈에 띕니다. 짧은 반복에서 목표 페이스보다 빠른 리듬을 익혀야 합니다.",
        "후반 체력보다 목표 페이스 자체를 편하게 만드는 작업이 먼저입니다."
      ], `coach-speed-${targetTime}-${Math.round(focus.speedGap * 10)}`),
      `10K 기준으로 약 ${formatTime(focus.speedGap)} 간격이 있습니다. ${weekText}`,
      `${officialTrainingComment} 이번 주 핵심 훈련으로 가져가세요.`,
      "목표는 최고 속도를 찍는 것이 아니라 같은 페이스를 여러 번 반복하는 것입니다.",
      "인터벌 다음 날은 기록 욕심을 내려놓고 회복에 집중하세요. 그래야 다음 훈련이 살아납니다."
    ].join("\n");
  }

  if (focus.needEndurance) {
    return [
      getFriendlyMessage([
        "하프 기록을 보면 후반 유지력을 조금 더 키우면 목표에 더 가까워질 수 있어요.",
        "스피드는 어느 정도 보이지만 오래 버티는 쪽에서 보완점이 있습니다.",
        "마라톤 목표에는 하프 이후의 안정감이 중요합니다. 지금은 롱런과 지속주가 답에 가깝습니다."
      ], `coach-endurance-${targetTime}-${Math.round(focus.enduranceGap * 10)}`),
      `하프 기준으로 약 ${formatTime(focus.enduranceGap)} 간격이 있습니다. ${mileageText}`,
      `${officialTrainingComment} 화요일에는 리듬을 만들고, 주말 롱런에서 오래 버티는 감각을 쌓아보세요.`,
      "롱런은 초반을 참는 훈련입니다. 마지막 5km까지 자세를 지키는 게 더 중요해요.",
      "천천히 오래 가는 힘이 결국 마라톤의 자신감이 됩니다."
    ].join("\n");
  }

  return [
    getFriendlyMessage([
      "현재 기록은 목표 마라톤 기록에 꽤 가까운 편이에요.",
      "기록 기준은 목표권 안에 있습니다. 이제는 훈련을 더 세게 하기보다 흔들리지 않게 유지하는 단계입니다.",
      "목표를 향한 기본 기록은 잘 맞아 있습니다. 남은 핵심은 컨디션 관리와 레이스 운영입니다."
    ], `coach-ready-${targetTime}-${Math.round(focus.recentMileage)}`),
    `${mileageText} ${weekText}`,
    "무리해서 강도를 올리기보다 화요일 나빌러닝 정훈, 주중 템포런, 주말 롱런의 균형을 유지해보세요.",
    "컨디션이 좋은 날에도 계획보다 많이 뛰기보다는 다음 훈련을 살리는 쪽이 좋습니다.",
    "지금 흐름을 차분히 이어가면 충분히 좋은 레이스를 만들 수 있습니다."
  ].join("\n");
}

function getMarathonPace(targetTime) {
  return targetTime / 42.195;
}

function formatTrainingPlanLine(day, sessionText) {
  if (day === "화" && sessionText.startsWith(OFFICIAL_TRAINING_LABEL)) {
    return `<span class="official-training-label">${day}: ${OFFICIAL_TRAINING_LABEL}</span>${sessionText.slice(OFFICIAL_TRAINING_LABEL.length)}`;
  }

  return `${day}: ${sessionText}`;
}

function generateTrainingPlan(pb, targetTime, required10K, requiredHalf) {
  const marathonPace = getMarathonPace(targetTime);
  const needSpeed = pb["10K"] && pb["10K"].time > required10K;
  const needEndurance = pb["HALF"] && pb["HALF"].time > requiredHalf;
  const officialTrainingText = getOfficialTrainingPlanText(getMarathonPredictionBasis()?.predictedTime || targetTime);
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  let sessions;

  if (needSpeed && needEndurance) {
    sessions = [
      { text: `가벼운 조깅 5km (${formatPace(marathonPace * 1.35)})`, distance: 5 },
      { text: officialTrainingText, distance: 8 },
      { text: `회복 조깅 4km (${formatPace(marathonPace * 1.4)})`, distance: 4 },
      { text: `템포런 6km (${formatPace(marathonPace * 0.9)})`, distance: 6 },
      { text: "휴식", distance: 0 },
      { text: `조깅 8km (${formatPace(marathonPace * 1.25)})`, distance: 8 },
      { text: `롱런 18km (${formatPace(marathonPace * 1.2)})`, distance: 18 }
    ];
  } else if (needSpeed) {
    sessions = [
      { text: `가벼운 조깅 5km (${formatPace(marathonPace * 1.3)})`, distance: 5 },
      { text: officialTrainingText, distance: 8 },
      { text: "휴식", distance: 0 },
      { text: `템포런 6km (${formatPace(marathonPace * 0.9)})`, distance: 6 },
      { text: `회복 조깅 5km (${formatPace(marathonPace * 1.4)})`, distance: 5 },
      { text: `지속주 8km (${formatPace(marathonPace * 1.05)})`, distance: 8 },
      { text: `롱런 14km (${formatPace(marathonPace * 1.2)})`, distance: 14 }
    ];
  } else if (needEndurance) {
    sessions = [
      { text: `가벼운 조깅 6km (${formatPace(marathonPace * 1.3)})`, distance: 6 },
      { text: officialTrainingText, distance: 8 },
      { text: `템포런 7km (${formatPace(marathonPace * 0.95)})`, distance: 7 },
      { text: "휴식", distance: 0 },
      { text: `회복 조깅 5km (${formatPace(marathonPace * 1.4)})`, distance: 5 },
      { text: `조깅 8km (${formatPace(marathonPace * 1.25)})`, distance: 8 },
      { text: `롱런 18km (${formatPace(marathonPace * 1.2)})`, distance: 18 }
    ];
  } else {
    sessions = [
      { text: `가벼운 조깅 5km (${formatPace(marathonPace * 1.3)})`, distance: 5 },
      { text: officialTrainingText, distance: 8 },
      { text: "휴식", distance: 0 },
      { text: `조깅 6km (${formatPace(marathonPace * 1.25)})`, distance: 6 },
      { text: `가속주 포함 조깅 6km (${formatPace(marathonPace * 1.15)})`, distance: 6 },
      { text: `조깅 8km (${formatPace(marathonPace * 1.2)})`, distance: 8 },
      { text: `롱런 14km (${formatPace(marathonPace * 1.2)})`, distance: 14 }
    ];
  }

  if (!sessions.some((session) => session.text === "휴식")) {
    sessions[3] = { text: "휴식", distance: 0 };
  }

  const weeklyMileage = sessions.reduce((total, session) => total + session.distance, 0);
  const lines = days.map((day, index) => formatTrainingPlanLine(day, sessions[index].text));

  return { lines, weeklyMileage };
}

function drawChart(runs) {
  const filtered = runs.filter((run) => {
    const matchesDistance = !filterDistance
      || filterDistance.value === "all"
      || String(run.distance) === filterDistance.value;

    return matchesDistance && isRunInSelectedPeriod(run);
  });

  const runsByDate = new Map();

  filtered.forEach((run) => {
    if (!run.runDate) return;

    const dailyRuns = runsByDate.get(run.runDate) || [];
    dailyRuns.push(run);
    runsByDate.set(run.runDate, dailyRuns);
  });

  const chartDates = Array.from(runsByDate.keys()).sort();
  const labels = chartDates.map((date) => formatChartDate(date));
  const dailyChartData = chartDates.map((date) => {
    const dailyRuns = runsByDate.get(date) || [];

    const totalDistance = dailyRuns.reduce((total, run) => total + run.distance, 0);
    const totalTime = dailyRuns.reduce((total, run) => total + run.time, 0);

    return {
      distance: Number(totalDistance.toFixed(2)),
      pace: Number((totalTime / totalDistance).toFixed(2)),
      run: {
        distance: totalDistance,
        time: totalTime
      }
    };
  });
  const paceData = dailyChartData.map((day) => day.pace);
  const distanceData = dailyChartData.map((day) => day.distance);
  const totalDistance = dailyChartData.reduce((total, day) => total + day.run.distance, 0);
  const totalTime = dailyChartData.reduce((total, day) => total + day.run.time, 0);
  const averagePace = totalDistance > 0 ? totalTime / totalDistance : 0;
  const averagePaceData = dailyChartData.map(() => Number(averagePace.toFixed(2)));
  const ctx = document.getElementById("runChart");
  const chartEmpty = document.getElementById("chartEmpty");
  const isMobileChart = window.matchMedia("(max-width: 520px)").matches;

  if (!ctx || !window.Chart) return;
  if (chartEmpty) {
    chartEmpty.classList.toggle("hidden", dailyChartData.length > 0);
  }
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "거리",
          data: distanceData,
          yAxisID: "distance",
          backgroundColor: "rgba(245, 181, 43, 0.36)",
          borderColor: "rgba(245, 181, 43, 0.9)",
          borderWidth: 1
        },
        {
          type: "line",
          label: "페이스",
          data: paceData,
          yAxisID: "pace",
          borderColor: "rgba(35, 89, 220, 0.95)",
          backgroundColor: "rgba(35, 89, 220, 0.12)",
          tension: 0.25,
          pointRadius: 4
        },
        {
          type: "line",
          label: "평균페이스",
          data: averagePaceData,
          yAxisID: "pace",
          borderColor: "rgba(231, 84, 73, 0.95)",
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    },
    options: {
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        x: {
          ticks: {
            color: "#172033",
            font: {
              weight: "700"
            },
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: 12
          },
          grid: {
            color: "rgba(93, 106, 134, 0.16)"
          }
        },
        pace: {
          type: "linear",
          position: "left",
          reverse: true,
          title: {
            display: true,
            text: "페이스 (분/km)",
            color: "#1744b2",
            font: {
              size: 14,
              weight: "800"
            }
          },
          ticks: {
            color: "#1744b2",
            font: {
              weight: "700"
            },
            callback: (value) => formatPace(value).replace("/km", "")
          }
        },
        distance: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: "거리 (km)",
            color: "#9a6500",
            font: {
              size: 14,
              weight: "800"
            }
          },
          ticks: {
            color: "#9a6500",
            font: {
              weight: "700"
            }
          }
        }
      },
      plugins: {
        legend: {
          position: "top",
          align: "center",
          labels: {
            color: "#172033",
            boxWidth: isMobileChart ? 10 : 18,
            boxHeight: isMobileChart ? 10 : 12,
            padding: isMobileChart ? 8 : 14,
            usePointStyle: true,
            pointStyle: "circle",
            font: {
              size: isMobileChart ? 10 : 12,
              weight: "800"
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const day = dailyChartData[context.dataIndex];
              const run = day.run;
              if (context.dataset.yAxisID === "distance") {
                return `거리: ${Number(run.distance.toFixed(2))}km`;
              }

              if (context.dataset.label === "평균페이스") {
                return `평균 페이스: ${formatPace(averagePace)}`;
              }

              return `페이스: ${formatPace(run.time / run.distance)}`;
            }
          }
        }
      }
    }
  });
}
