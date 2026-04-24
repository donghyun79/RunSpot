import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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
const INITIAL_VISIBLE_RANKING_COUNT = 5;
const INITIAL_VISIBLE_RUN_COUNT = 7;
const RUN_LOAD_MORE_COUNT = 7;
let visibleClubRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
let visibleChallengeRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
let latestClubRankings = [];
let latestClubRankingMeta = null;
let latestChallengeRankings = [];
let latestChallengeRankingMeta = null;
let visibleRunCount = INITIAL_VISIBLE_RUN_COUNT;
let signupInProgress = false;
let selectedAdminMember = null;
let selectedAdminRuns = [];
let memberRunsLoadId = 0;
let editingRun = null;
let editingQualityRun = null;
let latestSuggestions = [];
let latestHealingEvents = [];
let latestHealingResponses = [];
let latestHealingCheckins = [];
let latestHealingCheers = [];
let editingHealingEvent = null;
let editingHealingCheckin = null;
let editingHealingCheer = null;
let healingEventHostForm = null;
let healingEventTitleInput = null;
let healingEventTypeSelect = null;
let healingEventDateInput = null;
let healingEventLocationInput = null;
let healingEventDescriptionInput = null;
let saveHealingEventBtn = null;
let cancelHealingEventEditBtn = null;
let healingCheckinMoodInput = null;
let healingCheckinContentInput = null;
let saveHealingCheckinBtn = null;
let cancelHealingCheckinEditBtn = null;
let healingCheerContentInput = null;
let saveHealingCheerBtn = null;
let cancelHealingCheerEditBtn = null;
let latestEnvironment = null;
const CLUB_INVITE_CODE = "NAVIHEAL";
const HOST_EMAIL = "dhseo@skku.edu";
const HOST_NAME = "서동현";
const PRE_APPROVED_MEMBERS = [
  { name: "김성균", email: "skyskim@naver.com" }
];
const MONTHLY_ATHLETE_START_MONTH = "2026-04";
const MONTHLY_GROWTH_SCORE_START_MONTH = "2026-05";
const MONTHLY_MILEAGE_OVER_TARGET_BONUS_MAX = 5;
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
const QUALITY_MAKEUP_CREDIT = 0.7;
let runningGroupStandardsLoadedFromXlsx = false;
const QUALITY_NOTICE_VOTE_OPTIONS = [
  { value: "attend", label: "훈련 참석" },
  { value: "absent", label: "불참" },
  { value: "meal", label: "참석(훈련 후 식사 포함)" }
];
const QUALITY_MONTHLY_SCHEDULE = {
  4: {
    title: "4월 정훈 - 기초 지구력 + 페이스 적응",
    purpose: "기초 + LT",
    note: "",
    workouts: [
      { date: "4/7", text: "1600 x 4 (E조, S조: 3세트)" },
      { date: "4/14", text: "1000 x 4 (E조, S조: 3세트)" },
      { date: "4/21", text: "600 x 6 (E조, S조: 4세트)" },
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
      "비밀번호가 기억나지 않으면 비밀번호 재설정 버튼을 눌러주세요.",
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
      "이미 가입된 회원이라면 비밀번호 재설정 버튼으로 새 비밀번호를 설정해주세요.",
      mode === "login" ? "아직 회원 가입을 하지 않았다면 회원 가입을 먼저 진행해주세요." : "",
      contact
    ].filter(Boolean).join("\n");
  }

  return `${error?.message || "처리 중 오류가 발생했습니다."}\n${contact}`;
}

function isApprovedProfile(user, profile) {
  if (isHostUser(user)) return true;
  if (isPreApprovedMember(user, profile?.name)) return true;
  return profile?.approved !== false;
}

function isHostUser(user) {
  return getNormalizedEmail(user?.email) === HOST_EMAIL;
}

function getNormalizedEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isPreApprovedMember(user, displayName = "") {
  const email = getNormalizedEmail(user?.email);
  const name = String(displayName || user?.displayName || "").trim();

  return PRE_APPROVED_MEMBERS.some((member) => (
    getNormalizedEmail(member.email) === email
    || (member.name === name && getNormalizedEmail(member.email) === email)
  ));
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
  const approved = isHostUser(user) || isPreApprovedMember(user, displayName);

  await setDoc(doc(db, "users", user.uid), {
    userId: user.uid,
    email: user.email,
    name: displayName,
    approved,
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
    if (isHostUser(user) || isPreApprovedMember(user, profile.name)) {
      const approvedProfile = {
        ...profile,
        approved: true,
        disabled: false
      };

      await setDoc(doc(db, "users", user.uid), {
        approved: true,
        disabled: false,
        updatedAt: new Date()
      }, { merge: true });

      return approvedProfile;
    }

    return profile;
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
  const monthlyAthleteStatus = document.getElementById("monthlyAthleteStatus");

  if (recordListStatus) recordListStatus.innerText = message;
  if (rankingStatus) rankingStatus.innerText = message;
  if (monthlyGoalStatus) monthlyGoalStatus.innerText = message;
  if (monthlyAthleteStatus) monthlyAthleteStatus.innerText = message;
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isCurrentUserRankingEntry(entry, user) {
  if (!entry || !user) return false;

  const userEmail = normalizeEmail(user.email);
  const entryEmail = normalizeEmail(entry.email);
  const entryUserId = String(entry.userId || "").trim();
  const entryName = normalizeMemberName(entry.name);
  const userName = normalizeMemberName(getUserName(user));

  return entryUserId === user.uid
    || normalizeEmail(entryUserId) === userEmail
    || entryEmail === userEmail
    || (entryName && userName && entryName === userName);
}

function getCurrentUserNameKeys(user, profileNames = new Map()) {
  return new Set([
    getUserName(user),
    profileNames.get(user?.uid),
    profileNames.get(user?.email),
    user?.displayName
  ].map(normalizeMemberName).filter(Boolean));
}

function isCurrentUserRunData(data, user, profileNames = new Map()) {
  if (!data || !user) return false;

  const userEmail = normalizeEmail(user.email);
  const dataUserId = String(data.userId || "").trim();
  const dataEmail = normalizeEmail(data.email);
  const dataName = normalizeMemberName(getRankingName(data, profileNames));
  const currentUserNameKeys = getCurrentUserNameKeys(user, profileNames);

  return dataUserId === user.uid
    || normalizeEmail(dataUserId) === userEmail
    || dataEmail === userEmail
    || (dataName && currentUserNameKeys.has(dataName));
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
  const qualityManualTotalsToggle = document.getElementById("qualityManualTotalsToggle");

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
  if (qualityManualTotalsToggle) {
    qualityManualTotalsToggle.checked = !run.qualitySetResults;
  }
  qualitySelfRatingSelect.value = run.qualitySelfRating || "";
  qualityReflectionInput.value = run.qualityReflection || "";
  updateQualityTotalsInputMode();
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

  return `${label}${detail}`;
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

function getUpcomingWeatherRisk(hourly) {
  const times = hourly?.time || [];
  const weatherCodes = hourly?.weather_code || [];
  const precipitationProbabilities = hourly?.precipitation_probability || [];
  const now = new Date();
  const picked = times
    .map((time, index) => ({
      time: new Date(times[index]),
      weatherCode: Number(weatherCodes[index]),
      precipitationProbability: Math.round(Number(precipitationProbabilities[index]))
    }))
    .filter((entry) => entry.time.getTime() >= now.getTime())
    .slice(0, 4);

  return {
    maxPrecipitationProbability: picked.reduce((max, entry) => {
      return Number.isFinite(entry.precipitationProbability) ? Math.max(max, entry.precipitationProbability) : max;
    }, 0),
    hasRainOrStorm: picked.some((entry) => [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(entry.weatherCode))
  };
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
  const upcomingRisk = getUpcomingWeatherRisk(weatherData?.hourly);

  latestEnvironment = {
    temperature,
    humidity,
    weatherCode,
    weatherLabel: getWeatherLabel(weatherCode),
    pm10,
    pm25,
    pm10Grade,
    pm25Grade,
    ...upcomingRisk
  };

  widget.innerHTML = [
    `<span class="environment-pill weather"><span class="environment-main"><strong>노원구</strong> ${weatherText}</span><span class="environment-sub">${humidityText}</span>${trendHtml}</span>`,
    `<span class="environment-pill dust ${pm10Grade.className}" title="${pm10Grade.label === "좋음" ? "뛰기 좋은 공기예요." : pm10Grade.label === "보통" ? "가볍게 달리기엔 무난해요." : "강도 높은 러닝은 줄이는 게 좋아요."}"><span class="environment-main">${pm10Main}</span><span class="environment-sub">${pm10Sub}</span></span>`,
    `<span class="environment-pill dust ${pm25Grade.className}" title="${pm25Grade.label === "좋음" ? "뛰기 좋은 공기예요." : pm25Grade.label === "보통" ? "가볍게 달리기엔 무난해요." : "강도 높은 러닝은 줄이는 게 좋아요."}"><span class="environment-main">${pm25Main}</span><span class="environment-sub">${pm25Sub}</span></span>`
  ].join("");

  updateDailyRecommendation(latestRuns);
}

function resetNowonEnvironment() {
  const widget = document.getElementById("nowonEnvironment");

  if (!widget) return;

  latestEnvironment = null;
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
    latestEnvironment = null;
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

function getMonthChallengeLabel(monthKey = getCurrentMonthKey()) {
  const [, month] = monthKey.split("-");
  return `${Number(month)}월 챌린지`;
}

function updateMonthlyChallengeMonthLabel() {
  const monthlyChallengeMonthLabel = document.getElementById("monthlyChallengeMonthLabel");

  if (!monthlyChallengeMonthLabel) return;

  monthlyChallengeMonthLabel.innerText = getMonthChallengeLabel();
}

function getLatestFinalizedMonthKey() {
  return getPreviousMonthKey(getCurrentMonthKey());
}

function getPreviousMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 2, 1);

  return dateToInputValue(date).slice(0, 7);
}

function getQualityWorkoutTypeFromPlan(planText = "") {
  if (/TT/i.test(planText)) return "tt";

  return "interval";
}

function isQualityTimeTrialPlan(planText = "") {
  return /TT/i.test(String(planText || ""));
}

function isRankingEligibleQualityTimeTrial(planText = "") {
  const distance = getQualityTimeTrialDistance(planText);

  return isQualityTimeTrialPlan(planText) && (Math.abs(distance - 5) < 0.01 || Math.abs(distance - 10) < 0.01);
}

function estimateTimeForVdotDistance(vdot, distanceKm) {
  if (!Number.isFinite(vdot) || vdot <= 0 || !Number.isFinite(distanceKm) || distanceKm <= 0) return 0;

  let low = distanceKm * 2.2;
  let high = distanceKm * 12;

  for (let i = 0; i < 50; i += 1) {
    const mid = (low + high) / 2;
    const estimated = estimateVdot(mid, distanceKm);

    if (estimated > vdot) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function getQualityTimeTrialDistance(planText = "") {
  const match = String(planText || "").match(/(\d+(?:\.\d+)?)\s*(k|km)\s*TT/i);

  return match ? Number(match[1]) : 5;
}

function getQualityTimeTrialTargetPace(planText = "") {
  const distanceKm = getQualityTimeTrialDistance(planText);
  const pbKey = PB_CATEGORIES.find((category) => Math.abs(category.distance - distanceKm) <= getDistanceCategoryTolerance(category.distance))?.key;
  const pbRecord = pbKey ? pb[pbKey] : null;

  if (pbRecord?.pace) {
    return { pace: pbRecord.pace, source: "pb", distanceKm };
  }

  const vdotBasis = getVdotBasis();

  if (!vdotBasis) return { pace: 0, source: "", distanceKm };

  const estimatedTime = estimateTimeForVdotDistance(vdotBasis.vdot, distanceKm);
  const estimatedPace = estimatedTime ? estimatedTime / distanceKm : 0;

  return { pace: estimatedPace, source: estimatedPace ? "vdot" : "", distanceKm };
}

function getQualityTimeTrialPaceGuide(planText = "") {
  const target = getQualityTimeTrialTargetPace(planText);
  const distanceLabel = `${Number.isInteger(target.distanceKm) ? target.distanceKm : target.distanceKm.toFixed(1)}K`;

  if (target.source === "pb") {
    return `${distanceLabel} TT 기준: ${distanceLabel} PB 페이스 ${formatPace(target.pace)} 전후`;
  }

  if (target.source === "vdot") {
    return `${distanceLabel} TT 기준: VDOT 기반 ${distanceLabel} 예상 페이스 ${formatPace(target.pace)} 전후`;
  }

  return `${distanceLabel} TT 기준: 처음 1km는 살짝 여유 있게, 중반은 균등하게, 마지막 1km는 가능한 만큼 올려 주세요.`;
}

function buildQualityWorkoutDetail({ plannedWorkout, setResults, selfRating, reflection }) {
  return [
    plannedWorkout ? `계획: ${plannedWorkout}` : "",
    setResults ? `결과: ${setResults}` : "",
    selfRating ? `평가: ${selfRating}` : "",
    reflection ? `소감: ${reflection}` : ""
  ].filter(Boolean).join("\n");
}

function isQualityManualTotalsModeEnabled() {
  return Boolean(document.getElementById("qualityManualTotalsToggle")?.checked);
}

function updateQualityTotalsInputMode() {
  const manualMode = isQualityManualTotalsModeEnabled();
  const qualityDistanceInput = document.getElementById("qualityDistance");
  const qualityHourInput = document.getElementById("qualityHour");
  const qualityMinuteInput = document.getElementById("qualityMinute");
  const qualitySecondInput = document.getElementById("qualitySecond");
  const qualitySetInputs = document.getElementById("qualitySetInputs");
  const qualitySetGuide = document.getElementById("qualitySetGuide");
  const qualityTotalsGuide = document.getElementById("qualityTotalsGuide");
  const qualityDistanceLabel = document.getElementById("qualityDistanceLabel");
  const qualityHourLabel = document.getElementById("qualityHourLabel");
  const qualityMinuteLabel = document.getElementById("qualityMinuteLabel");
  const qualitySecondLabel = document.getElementById("qualitySecondLabel");

  [qualityDistanceInput, qualityHourInput, qualityMinuteInput, qualitySecondInput].forEach((input) => {
    if (!input) return;
    input.readOnly = !manualMode;
  });

  if (qualityDistanceInput) qualityDistanceInput.placeholder = manualMode ? "직접 입력 km" : "km";
  if (qualityHourInput) qualityHourInput.placeholder = manualMode ? "시간" : "h";
  if (qualityMinuteInput) qualityMinuteInput.placeholder = manualMode ? "분" : "m";
  if (qualitySecondInput) qualitySecondInput.placeholder = manualMode ? "초" : "s";

  if (qualityDistanceLabel) qualityDistanceLabel.innerText = manualMode ? "전체 거리" : "자동 총 거리";
  if (qualityHourLabel) qualityHourLabel.innerText = manualMode ? "전체 시간" : "자동 시간";
  if (qualityMinuteLabel) qualityMinuteLabel.innerText = manualMode ? "전체 분" : "자동 분";
  if (qualitySecondLabel) qualitySecondLabel.innerText = manualMode ? "전체 초" : "자동 초";

  if (qualitySetInputs) qualitySetInputs.style.opacity = manualMode ? "0.45" : "1";
  if (qualitySetGuide) {
    qualitySetGuide.innerText = manualMode
      ? "세트별 기록이 불확실한 경우 전체 거리와 전체 시간만 입력해서 저장할 수 있습니다."
      : getQualityWorkoutStructure(document.getElementById("qualityPlannedWorkout")?.value || "", document.getElementById("qualityWorkoutType")?.value || "").guide;
  }
  if (qualityTotalsGuide) {
    qualityTotalsGuide.innerText = manualMode
      ? "이 모드에서는 전체 거리와 전체 시간을 직접 입력합니다."
      : "총 거리와 총 시간은 세트 기록과 리커버리 시간을 기준으로 자동 계산됩니다. 별도로 입력하지 않아도 됩니다.";
  }
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
  const setValues = Array.from(document.querySelectorAll(".quality-set-field"))
    .map((field, index) => {
      const setValue = getQualityDurationValueFromField(field, "set");
      const recoveryValue = getQualityDurationValueFromField(field, "recovery");

      if (!setValue && !recoveryValue) return "";

      return [
        `${index + 1}세트 ${setValue || "-"}`,
        recoveryValue ? `R ${recoveryValue}` : ""
      ].filter(Boolean).join(" ");
    })
    .filter(Boolean);

  return setValues.join(", ");
}

function parseQualitySetResults(setResults = "") {
  const [setsText = ""] = String(setResults).split("/");
  const setValues = [];
  const recoveryValues = [];

  setsText.split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => {
    const labeledMatch = value.match(/^\d+세트\s+(.+?)(?:\s+R\s+(.+))?$/i);

    if (labeledMatch) {
      setValues.push(labeledMatch[1] === "-" ? "" : labeledMatch[1].trim());
      recoveryValues.push(labeledMatch[2]?.trim() || "");
      return;
    }

    const inlineRecoveryMatch = value.match(/^(.+?)\s*\(R\s*([^)]+)\)$/i);

    if (inlineRecoveryMatch) {
      setValues.push(inlineRecoveryMatch[1].trim());
      recoveryValues.push(inlineRecoveryMatch[2].trim());
      return;
    }

    setValues.push(value);
    recoveryValues.push("");
  });

  return { setValues, recoveryValues };
}

function parseQualityDurationMinutes(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/(\d{1,2})(?::(\d{2}))(?::(\d{2}))?$/);

  if (!match) return 0;

  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] === undefined ? null : Number(match[3]);

  if (third === null) {
    return first + (second / 60);
  }

  return (first * 60) + second + (third / 60);
}

function splitQualityDurationParts(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2})(?::(\d{1,2})(?:\.\d+)?)?$/);

  if (!match) {
    return { minutes: "", seconds: "" };
  }

  return {
    minutes: match[1] || "",
    seconds: match[2] || ""
  };
}

function buildQualityDurationValue(minutes = "", seconds = "") {
  const trimmedMinutes = String(minutes || "").trim();
  const trimmedSeconds = String(seconds || "").trim();

  if (!trimmedMinutes && !trimmedSeconds) return "";

  const minuteValue = Math.max(0, Number.parseInt(trimmedMinutes || "0", 10) || 0);
  const secondValue = Math.max(0, Math.min(59, Number.parseInt(trimmedSeconds || "0", 10) || 0));

  return `${minuteValue}:${String(secondValue).padStart(2, "0")}`;
}

function getQualityDurationValueFromField(field, role = "set") {
  const prefix = role === "recovery" ? "recovery" : "set";
  const minuteValue = field?.querySelector(`.quality-${prefix}-minute-input`)?.value || "";
  const secondValue = field?.querySelector(`.quality-${prefix}-second-input`)?.value || "";

  return buildQualityDurationValue(minuteValue, secondValue);
}

function setQualityTimeInputs(timeMinutes) {
  const qualityHourInput = document.getElementById("qualityHour");
  const qualityMinuteInput = document.getElementById("qualityMinute");
  const qualitySecondInput = document.getElementById("qualitySecond");

  if (!qualityHourInput || !qualityMinuteInput || !qualitySecondInput) return;

  if (!timeMinutes) {
    qualityHourInput.value = "";
    qualityMinuteInput.value = "";
    qualitySecondInput.value = "";
    return;
  }

  const totalSeconds = Math.round(timeMinutes * 60);
  qualityHourInput.value = Math.floor(totalSeconds / 3600) || "";
  qualityMinuteInput.value = Math.floor((totalSeconds % 3600) / 60) || "";
  qualitySecondInput.value = totalSeconds % 60 || "";
}

function updateQualityCalculatedTotals() {
  const qualityDistanceInput = document.getElementById("qualityDistance");
  const plannedWorkout = document.getElementById("qualityPlannedWorkout")?.value || "";
  const workoutType = document.getElementById("qualityWorkoutType")?.value || "";

  if (!qualityDistanceInput) return;
  if (isQualityManualTotalsModeEnabled()) return;

  const structure = getQualityWorkoutStructure(plannedWorkout, workoutType);
  let totalDistance = 0;
  let totalTime = 0;

  Array.from(document.querySelectorAll(".quality-set-field")).forEach((field) => {
    const setTime = parseQualityDurationMinutes(getQualityDurationValueFromField(field, "set"));
    const recoveryTime = parseQualityDurationMinutes(getQualityDurationValueFromField(field, "recovery"));

    if (setTime) {
      totalTime += setTime;
      totalDistance += structure.setDistanceKm || 0;
    }

    if (recoveryTime) {
      totalTime += recoveryTime;
      totalDistance += structure.recoveryDistanceKm || 0;
    }
  });

  qualityDistanceInput.value = totalDistance ? Number(totalDistance.toFixed(2)) : "";
  setQualityTimeInputs(totalTime);
}

function formatQualityRepDistance(distance, unit = "") {
  const value = Number(distance);
  const normalizedUnit = String(unit || "m").toLowerCase();

  if (!Number.isFinite(value) || value <= 0) return "세트";

  if (normalizedUnit.startsWith("k")) {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}K`;
  }

  return `${Math.round(value)}m`;
}

function getQualityIntervalDistanceMeters(distance, unit = "") {
  const value = Number(distance);
  const normalizedUnit = String(unit || "m").toLowerCase();

  if (!Number.isFinite(value) || value <= 0) return 0;

  return normalizedUnit.startsWith("k") ? Math.round(value * 1000) : Math.round(value);
}

function getQualityRecoveryDistanceMeters(intervalMeters) {
  if (!intervalMeters) return 0;
  if (intervalMeters <= 600) return 200;

  return 400;
}

function formatQualityRecoveryDistance(distanceMeters) {
  if (!distanceMeters) return "";
  if (distanceMeters >= 1000 && distanceMeters % 1000 === 0) return `${distanceMeters / 1000}km`;

  return `${distanceMeters}m`;
}

function getQualityRecoveryDistanceLabelFromPlan(planText = "") {
  const match = String(planText || "").match(/(\d+(?:\.\d+)?)\s*(k|km|m)?\s*(?:x|×)\s*(\d+)/i);

  if (!match) return "";

  const intervalMeters = getQualityIntervalDistanceMeters(match[1], match[2]);
  return formatQualityRecoveryDistance(getQualityRecoveryDistanceMeters(intervalMeters));
}

function parseQualityGroupSetNote(planText = "") {
  const text = String(planText || "");
  const noteText = text.split("/").slice(1).join("/").trim();
  const noteMatch = noteText.match(/^([A-Za-z가-힣,\s]+)\s*(\d+)\s*세트?$/)
    || text.match(/\(([A-Za-z가-힣조,\s]+):\s*(\d+)\s*세트\)/);

  if (!noteMatch) return null;

  const groups = noteMatch[1]
    .split(",")
    .map((group) => group.replace(/조/g, "").trim())
    .filter(Boolean);
  const setCount = Number(noteMatch[2]);

  if (!groups.length || !setCount) return null;

  return { groups, setCount };
}

function formatQualityGroupSetNote(planText = "") {
  const groupSetNote = parseQualityGroupSetNote(planText);

  if (!groupSetNote) return "";

  return `${groupSetNote.groups.map((group) => `${group}조`).join(", ")}: ${groupSetNote.setCount}세트`;
}

function formatQualityWorkoutPlanText(planText = "") {
  const text = String(planText || "").trim();
  const baseText = text.split("/")[0]?.trim() || text;
  const groupSetLabel = formatQualityGroupSetNote(text);
  const recoveryDistanceLabel = isQualityTimeTrialPlan(text) ? "" : getQualityRecoveryDistanceLabelFromPlan(text);
  const details = [
    recoveryDistanceLabel ? `리커버리 ${recoveryDistanceLabel}` : "",
    groupSetLabel
  ].filter(Boolean);

  if (/\(.*리커버리\s+\d/.test(text)) return text;

  return details.length ? `${baseText} (${details.join(" / ")})` : text;
}

function getQualityWorkoutStructure(planText = "", workoutType = "") {
  const text = String(planText || "").trim();
  const type = String(workoutType || "").trim();
  const groupSetNote = parseQualityGroupSetNote(text);
  const repetitionMatch = text.match(/(\d+(?:\.\d+)?)\s*(k|km|m)?\s*(?:x|×)\s*(\d+)/i);
  const ttMatch = text.match(/(\d+(?:\.\d+)?)\s*(k|km)\s*TT/i);

  if (/tt/i.test(text) || type === "tt") {
    const ttDistance = ttMatch ? formatQualityRepDistance(ttMatch[1], ttMatch[2]) : "TT";
    const ttDistanceKm = getQualityTimeTrialDistance(text);

    return {
      setCount: 1,
      setLabel: `${ttDistance} 결과`,
      guide: `${ttDistance} 타임트라이얼은 리커버리 반복훈련이 아니라 기록 측정입니다. ${getQualityTimeTrialPaceGuide(text)}`,
      hasRecoveryInputs: false,
      setDistanceKm: ttDistanceKm,
      recoveryDistanceKm: 0
    };
  }

  if (repetitionMatch) {
    const repDistance = formatQualityRepDistance(repetitionMatch[1], repetitionMatch[2]);
    const intervalMeters = getQualityIntervalDistanceMeters(repetitionMatch[1], repetitionMatch[2]);
    const recoveryDistanceLabel = formatQualityRecoveryDistance(getQualityRecoveryDistanceMeters(intervalMeters));
    const setCount = Math.max(1, Math.min(Number(repetitionMatch[3]) || 1, 16));
    const groupGuide = groupSetNote
      ? ` ${groupSetNote.groups.map((group) => `${group}조`).join(", ")}는 ${groupSetNote.setCount}세트까지만 입력해도 됩니다.`
      : "";
    const recoveryGuide = recoveryDistanceLabel ? ` 세트 후 리커버리는 ${recoveryDistanceLabel} 조깅 기준입니다.` : "";

    return {
      setCount,
      setLabel: `${repDistance}`,
      guide: `${repDistance} ${setCount}세트 기록과 각 세트 후 리커버리 시간만 입력해 주세요.${groupGuide}${recoveryGuide} 총 거리와 시간은 자동 계산됩니다.`,
      setDistanceKm: intervalMeters / 1000,
      recoveryDistanceKm: getQualityRecoveryDistanceMeters(intervalMeters) / 1000
    };
  }

  return {
    setCount: 6,
    setLabel: "세트",
    guide: "훈련 프로그램에 맞춰 세트 기록을 입력해 주세요. 직접 입력한 훈련은 기본 6칸을 제공합니다.",
    setDistanceKm: 0,
    recoveryDistanceKm: 0
  };
}

function renderQualitySetInputs(planText = "", setResults = "") {
  const container = document.getElementById("qualitySetInputs");
  const guide = document.getElementById("qualitySetGuide");

  if (!container) return;

  const workoutType = document.getElementById("qualityWorkoutType")?.value || "";
  const structure = getQualityWorkoutStructure(planText, workoutType);
  const { setValues, recoveryValues } = parseQualitySetResults(setResults);

  container.innerHTML = "";

  Array.from({ length: structure.setCount }).forEach((_, index) => {
    const field = document.createElement("div");
    const title = document.createElement("div");
    const setLabel = document.createElement("label");
    const recoveryLabel = document.createElement("label");
    const setDuration = createQualityDurationInputGroup(setValues[index] || "", "set");
    const recoveryDuration = createQualityDurationInputGroup(recoveryValues[index] || "", "recovery");

    field.className = "quality-set-field";
    title.className = "quality-set-field-title";
    title.innerText = structure.setCount > 1 ? `${structure.setLabel} ${index + 1}` : structure.setLabel;
    setLabel.append("기록");
    setLabel.appendChild(setDuration);
    field.appendChild(title);
    field.appendChild(setLabel);
    if (structure.hasRecoveryInputs !== false) {
      recoveryLabel.append("리커버리");
      recoveryLabel.appendChild(recoveryDuration);
      field.appendChild(recoveryLabel);
    }
    container.appendChild(field);
  });

  if (guide && !isQualityManualTotalsModeEnabled()) {
    guide.innerText = structure.guide;
  }

  updateQualityCalculatedTotals();
  updateQualityTotalsInputMode();
}

function createQualityDurationInputGroup(value = "", role = "set") {
  const wrap = document.createElement("div");
  const row = document.createElement("div");
  const minuteInput = document.createElement("input");
  const separator = document.createElement("span");
  const secondInput = document.createElement("input");
  const parts = splitQualityDurationParts(value);

  wrap.className = "quality-duration-group";
  row.className = "quality-duration-row";

  minuteInput.type = "number";
  minuteInput.min = "0";
  minuteInput.step = "1";
  minuteInput.inputMode = "numeric";
  minuteInput.placeholder = "분";
  minuteInput.className = `quality-duration-input quality-${role === "recovery" ? "recovery" : "set"}-minute-input`;
  minuteInput.value = parts.minutes;
  minuteInput.addEventListener("input", updateQualityCalculatedTotals);

  separator.className = "quality-duration-separator";
  separator.innerText = ":";

  secondInput.type = "number";
  secondInput.min = "0";
  secondInput.max = "59";
  secondInput.step = "1";
  secondInput.inputMode = "numeric";
  secondInput.placeholder = "초";
  secondInput.className = `quality-duration-input quality-${role === "recovery" ? "recovery" : "set"}-second-input`;
  secondInput.value = parts.seconds;
  secondInput.addEventListener("input", updateQualityCalculatedTotals);

  row.append(minuteInput, separator, secondInput);
  wrap.append(row);

  return wrap;
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

  if (!actualPace) {
    return isQualityTimeTrialPlan(plannedWorkout)
      ? getQualityTimeTrialPaceGuide(plannedWorkout)
      : `I 기준 ${paces.interval}`;
  }

  const ttTarget = isQualityTimeTrialPlan(plannedWorkout) ? getQualityTimeTrialTargetPace(plannedWorkout) : null;
  const targetPace = ttTarget?.pace || solvePaceForVdot(paces.vdot, 0.985);
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
  const plannedWorkout = document.getElementById("qualityPlannedWorkout")?.value || "";
  renderQualitySetInputs(plannedWorkout, setResults);
}

function getQualityWorkoutOptionDateValue(optionValue = "", year = new Date().getFullYear()) {
  const workoutDate = parseQualityWorkoutDate(optionValue, year);
  return workoutDate ? dateToInputValue(workoutDate) : "";
}

function syncQualityPlanSelection({ selectedValue = "", resetResults = false } = {}) {
  const qualityDateInput = document.getElementById("qualityDate");
  const qualityPlanSelect = document.getElementById("qualityPlanSelect");
  const qualityWorkoutTypeSelect = document.getElementById("qualityWorkoutType");
  const qualityPlannedWorkoutInput = document.getElementById("qualityPlannedWorkout");
  const qualitySetResultsInput = document.getElementById("qualitySetResults");

  if (!qualityPlanSelect || !qualityWorkoutTypeSelect || !qualityPlannedWorkoutInput) return;

  const selected = Array.from(qualityPlanSelect.options).find((option) => option.value === selectedValue)
    || qualityPlanSelect.selectedOptions?.[0];

  if (!selected || !selected.value) {
    renderQualitySetInputs(qualityPlannedWorkoutInput.value, getQualitySetResultsFromInputs());
    return;
  }

  qualityPlanSelect.value = selected.value;
  qualityPlannedWorkoutInput.value = formatQualityWorkoutPlanText(selected.dataset.workout || "");
  qualityWorkoutTypeSelect.value = selected.dataset.type || "interval";

  const officialDateValue = getQualityWorkoutOptionDateValue(selected.value);

  if (qualityDateInput && officialDateValue) {
    qualityDateInput.value = officialDateValue;
  }

  if (resetResults && qualitySetResultsInput) {
    qualitySetResultsInput.value = "";
    fillQualitySetInputs("");
    return;
  }

  renderQualitySetInputs(qualityPlannedWorkoutInput.value, getQualitySetResultsFromInputs());
}

function syncQualityPlanByDate(dateValue = "", { preserveResults = true } = {}) {
  const qualityPlanSelect = document.getElementById("qualityPlanSelect");
  const qualityWorkoutTypeSelect = document.getElementById("qualityWorkoutType");
  const qualityPlannedWorkoutInput = document.getElementById("qualityPlannedWorkout");
  const qualitySetResultsInput = document.getElementById("qualitySetResults");

  if (!qualityPlanSelect || !qualityWorkoutTypeSelect || !qualityPlannedWorkoutInput) return;

  const matchedOption = Array.from(qualityPlanSelect.options).find((option) => (
    option.value && getQualityWorkoutOptionDateValue(option.value) === dateValue
  ));

  if (!matchedOption) {
    qualityPlanSelect.value = "";
    renderQualitySetInputs(qualityPlannedWorkoutInput.value, getQualitySetResultsFromInputs());
    return;
  }

  qualityPlanSelect.value = matchedOption.value;
  qualityPlannedWorkoutInput.value = formatQualityWorkoutPlanText(matchedOption.dataset.workout || "");
  qualityWorkoutTypeSelect.value = matchedOption.dataset.type || "interval";

  if (!preserveResults && qualitySetResultsInput) {
    qualitySetResultsInput.value = "";
    fillQualitySetInputs("");
    return;
  }

  renderQualitySetInputs(qualityPlannedWorkoutInput.value, getQualitySetResultsFromInputs());
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
  return getDateKey(run.runDate).startsWith(monthKey);
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
  const openUpdateModalBtn = document.getElementById("openUpdateModal");
  const email = document.getElementById("email");
  const name = document.getElementById("name");
  const password = document.getElementById("password");
  const inviteCode = document.getElementById("inviteCode");
  const signupBtn = document.getElementById("signup");
  const loginBtn = document.getElementById("login");
  const resetPasswordBtn = document.getElementById("resetPassword");
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
  const loadMoreRankingBtn = document.getElementById("loadMoreRanking");
  const rankingDistance = document.getElementById("rankingDistance");
  const rankingType = document.getElementById("rankingType");
  const monthlyChallengeGroup = document.getElementById("monthlyChallengeGroup");
  const loadMoreWeeklyRankingBtn = document.getElementById("loadMoreWeeklyRanking");
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
  const healingTab = document.getElementById("healingTab");
  const suggestionTab = document.getElementById("suggestionTab");
  const trainingView = document.getElementById("trainingView");
  const qualityView = document.getElementById("qualityView");
  const healingView = document.getElementById("healingView");
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
  const qualityManualTotalsToggle = document.getElementById("qualityManualTotalsToggle");
  const saveQualityRunBtn = document.getElementById("saveQualityRun");
  const cancelQualityRunEditBtn = document.getElementById("cancelQualityRunEdit");
  const qualityEditStatus = document.getElementById("qualityEditStatus");
  const editGroupStandardsBtn = document.getElementById("editGroupStandards");
  const saveGroupStandardsBtn = document.getElementById("saveGroupStandards");
  const cancelGroupStandardEditBtn = document.getElementById("cancelGroupStandardEdit");
  healingEventHostForm = document.getElementById("healingEventHostForm");
  healingEventTitleInput = document.getElementById("healingEventTitle");
  healingEventTypeSelect = document.getElementById("healingEventType");
  healingEventDateInput = document.getElementById("healingEventDate");
  healingEventLocationInput = document.getElementById("healingEventLocation");
  healingEventDescriptionInput = document.getElementById("healingEventDescription");
  saveHealingEventBtn = document.getElementById("saveHealingEvent");
  cancelHealingEventEditBtn = document.getElementById("cancelHealingEventEdit");
  healingCheckinMoodInput = document.getElementById("healingCheckinMood");
  healingCheckinContentInput = document.getElementById("healingCheckinContent");
  saveHealingCheckinBtn = document.getElementById("saveHealingCheckin");
  cancelHealingCheckinEditBtn = document.getElementById("cancelHealingCheckinEdit");
  healingCheerContentInput = document.getElementById("healingCheerContent");
  saveHealingCheerBtn = document.getElementById("saveHealingCheer");
  cancelHealingCheerEditBtn = document.getElementById("cancelHealingCheerEdit");

  filterDistance = document.getElementById("filterDistance");
  filterPeriod = document.getElementById("filterPeriod");
  runDateInput.value = getTodayDateString();
  qualityDateInput.value = getTodayDateString();
  fillQualitySetInputs("");
  if (qualityManualTotalsToggle) {
    qualityManualTotalsToggle.checked = false;
  }
  updateQualityTotalsInputMode();
  updateMonthlyChallengeMonthLabel();

  function openUpdateNotice() {
    if (!updateModal) return;

    updateModal.classList.remove("hidden");
    closeUpdateModalBtn?.focus();
  }

  function closeUpdateNotice() {
    if (!updateModal) return;

    updateModal.classList.add("hidden");
  }

  closeUpdateModalBtn?.addEventListener("click", closeUpdateNotice);
  openUpdateModalBtn?.addEventListener("click", openUpdateNotice);
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#openUpdateModal")) {
      event.preventDefault();
      openUpdateNotice();
    }
  });
  updateModal?.addEventListener("click", (event) => {
    if (event.target === updateModal) closeUpdateNotice();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !updateModal?.classList.contains("hidden")) {
      closeUpdateNotice();
    }
  });

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
    syncHealingEventFormVisibility(user);

    if (!isHost) {
      document.getElementById("memberList").innerHTML = "";
      clearMemberRunsPanel();
    }
  }

  function setActiveAppView(viewName) {
    const showsQuality = viewName === "quality";
    const showsHealing = viewName === "healing";
    const showsSuggestion = viewName === "suggestion";

    trainingView.classList.toggle("hidden", showsQuality || showsHealing || showsSuggestion);
    qualityView.classList.toggle("hidden", !showsQuality);
    healingView.classList.toggle("hidden", !showsHealing);
    suggestionView.classList.toggle("hidden", !showsSuggestion);
    trainingTab.classList.toggle("active", viewName === "training");
    qualityTab.classList.toggle("active", showsQuality);
    healingTab.classList.toggle("active", showsHealing);
    suggestionTab.classList.toggle("active", showsSuggestion);

    if (showsQuality) {
      renderVdotTrainingGuide();
      renderQualityMonthlyPlan();
      renderQualityRuns();
    }

    if (showsHealing) {
      loadHealingHub(auth.currentUser);
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
    syncQualityPlanSelection({
      selectedValue: qualityPlanSelect.value,
      resetResults: true
    });
  });
  qualityManualTotalsToggle?.addEventListener("change", () => {
    updateQualityTotalsInputMode();
  });
  qualityDateInput.addEventListener("change", () => {
    syncQualityPlanByDate(qualityDateInput.value, {
      preserveResults: false
    });
  });
  qualityWorkoutTypeSelect.addEventListener("change", () => {
    renderQualitySetInputs(qualityPlannedWorkoutInput.value, getQualitySetResultsFromInputs());
  });
  qualityPlannedWorkoutInput.addEventListener("input", () => {
    renderQualitySetInputs(qualityPlannedWorkoutInput.value, getQualitySetResultsFromInputs());
  });
  trainingTab.addEventListener("click", () => {
    setActiveAppView("training");
  });
  qualityTab.addEventListener("click", () => {
    setActiveAppView("quality");
  });
  healingTab.addEventListener("click", () => {
    setActiveAppView("healing");
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
    drawChart(latestRuns);
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

      const userCredential = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value);
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
      const userCredential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
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

  resetPasswordBtn.addEventListener("click", async () => {
    const targetEmail = email.value.trim();

    if (!targetEmail) {
      alert("비밀번호 재설정을 받을 이메일을 입력해주세요.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      alert("비밀번호 재설정 메일을 보냈습니다. 메일함에서 새 비밀번호를 설정한 뒤 로그인해주세요.");
    } catch (e) {
      alert(getAuthErrorMessage(e, "reset"));
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

        setActiveAppView("training");
        await loadMonthlyGoal(user).catch(showDashboardLoadError);
        await loadRunningGroupStandards(user).catch(showDashboardLoadError);
        await loadMyRuns(user).catch(showDashboardLoadError);
        await loadMonthlyAthleteCandidates(user).catch(showDashboardLoadError);
        await loadClubRanking(user).catch(showDashboardLoadError);
        await loadWeeklyRanking(user).catch(showDashboardLoadError);
        await loadSuggestions(user).catch(showDashboardLoadError);

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
      await loadMonthlyAthleteCandidates(user);
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
    const qualityPlanDate = qualityPlanSelect.value;
    const plannedWorkout = qualityPlannedWorkoutInput.value.trim();
    const manualTotalsMode = isQualityManualTotalsModeEnabled();
    const setResults = manualTotalsMode ? "" : getQualitySetResultsFromInputs();
    qualitySetResultsInput.value = setResults;
    if (!manualTotalsMode) {
      updateQualityCalculatedTotals();
    }
    const distance = Number(qualityDistanceInput.value);
    const hour = Number(qualityHourInput.value) || 0;
    const minute = Number(qualityMinuteInput.value) || 0;
    const second = Number(qualitySecondInput.value) || 0;
    const time = hour * 60 + minute + (second / 60);
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
      alert(manualTotalsMode
        ? "전체 거리와 전체 시간을 입력해주세요."
        : "세트 기록과 리커버리 시간을 입력하면 총 거리와 시간이 자동 계산됩니다. 입력값을 확인해주세요.");
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

    if (!manualTotalsMode && !setResults) {
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
        rankingEligible: isRankingEligibleQualityTimeTrial(plannedWorkout),
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
      await loadMonthlyAthleteCandidates(user);
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

  saveHealingEventBtn?.addEventListener("click", () => {
    saveHealingEvent();
  });
  document.getElementById("healingEventList")?.addEventListener("click", handleHealingEventListClick);
  cancelHealingEventEditBtn?.addEventListener("click", () => {
    resetHealingEventForm();
    setHealingStatus("event", "번개 공지 수정을 취소했습니다.");
  });

  saveHealingCheckinBtn?.addEventListener("click", () => {
    saveHealingCheckin();
  });
  document.getElementById("healingCheckinList")?.addEventListener("click", handleHealingCheckinListClick);
  cancelHealingCheckinEditBtn?.addEventListener("click", () => {
    resetHealingCheckinForm();
    setHealingStatus("checkin", "체크인 수정을 취소했습니다.");
  });

  saveHealingCheerBtn?.addEventListener("click", () => {
    saveHealingCheer();
  });
  document.getElementById("healingCheerList")?.addEventListener("click", handleHealingCheerListClick);
  cancelHealingCheerEditBtn?.addEventListener("click", () => {
    resetHealingCheerForm();
    setHealingStatus("cheer", "응원 수정을 취소했습니다.");
  });

  loadRankingBtn.addEventListener("click", () => {
    visibleClubRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
    loadClubRanking(auth.currentUser);
  });

  rankingDistance.addEventListener("change", () => {
    visibleClubRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
    loadClubRanking(auth.currentUser);
  });

  rankingType.addEventListener("change", () => {
    visibleClubRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
    loadClubRanking(auth.currentUser);
  });

  loadMoreRankingBtn?.addEventListener("click", () => {
    visibleClubRankingCount = latestClubRankings.length;
    renderClubRankingList(auth.currentUser);
  });

  monthlyChallengeGroup?.addEventListener("change", () => {
    visibleChallengeRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
    loadWeeklyRanking(auth.currentUser);
  });

  loadMoreWeeklyRankingBtn?.addEventListener("click", () => {
    visibleChallengeRankingCount = latestChallengeRankings.length;
    renderWeeklyRankingList(auth.currentUser);
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
  const runIds = new Set();

  resetPersonalBest();

  const q = query(
    collection(db, "runs"),
    where("userId", "==", user.uid)
  );

  const querySnapshot = await getDocsFromServer(q);

  querySnapshot.forEach((snapshotDoc) => {
    const run = buildRunRecord(snapshotDoc.id, snapshotDoc.data(), {
      userId: user.uid,
      name: getUserName(user),
      email: user.email
    });

    runIds.add(snapshotDoc.id);
    runs.push(run);
  });

  if (user.email) {
    const legacyRunsQuery = query(
      collection(db, "runs"),
      where("email", "==", user.email)
    );
    const legacyRunsSnapshot = await getDocsFromServer(legacyRunsQuery);

    legacyRunsSnapshot.forEach((snapshotDoc) => {
      if (runIds.has(snapshotDoc.id)) return;

      const run = buildRunRecord(snapshotDoc.id, snapshotDoc.data(), {
        userId: user.uid,
        name: getUserName(user),
        email: user.email
      });

      runIds.add(snapshotDoc.id);
      runs.push(run);
    });
  }

  runs.forEach((run) => {
    if (run.rankingEligible === false) return;

    updatePersonalBest(run.distance, run.time, run);
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
  const qualityManualTotalsToggle = document.getElementById("qualityManualTotalsToggle");

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
  if (qualityManualTotalsToggle) {
    qualityManualTotalsToggle.checked = false;
  }
  qualitySelfRatingSelect.value = "";
  qualityReflectionInput.value = "";
  updateQualityTotalsInputMode();
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
      { value: formatQualityWorkoutPlanText(qualityDisplay.plannedWorkout), className: "quality-text-cell" },
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
  const currentPlanValue = qualityPlanSelect?.value || "";
  const upcomingWorkout = getUpcomingQualityWorkout();
  const noticeWorkout = getQualityNoticeWorkout();
  const userGroup = getCurrentUserRunningGroup(getMarathonPredictionBasis()?.predictedTime);
  const upcomingPaceGuide = upcomingWorkout && isQualityTimeTrialPlan(upcomingWorkout.text)
    ? getQualityTimeTrialPaceGuide(upcomingWorkout.text)
    : userGroup
      ? `${userGroup.group}조 인터벌 페이스 ${userGroup.intervalPace} / 리커버리 ${userGroup.recoveryPace}`
      : "";

  if (!qualityMonthlyPlan) return;

  qualityMonthlyPlan.innerHTML = "";
  if (qualityPlanSelect) {
    qualityPlanSelect.innerHTML = '<option value="">직접 입력</option>';
  }

  const currentMonth = new Date().getMonth() + 1;
  const schedule = QUALITY_MONTHLY_SCHEDULE[currentMonth];

  if (!schedule) {
    if (noticeWorkout) {
      qualityMonthlyPlan.appendChild(createQualityNoticeArticle(noticeWorkout, userGroup));
    }

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

  if (noticeWorkout) {
    qualityMonthlyPlan.appendChild(createQualityNoticeArticle(noticeWorkout, userGroup));
  }

  const summary = document.createElement("article");
  summary.className = "quality-plan-item";
  summary.innerHTML = [
    `<div class="quality-plan-title">${schedule.title}</div>`,
    `<div>월별 목적: ${schedule.purpose}</div>`,
    '<div class="quality-plan-meta">기초 지구력을 유지하면서 LT 강도에 적응해 안정적인 페이스 감각을 만드는 달입니다.</div>',
    schedule.note ? `<div class="quality-plan-meta">${schedule.note}</div>` : ""
  ].filter(Boolean).join("");
  qualityMonthlyPlan.appendChild(summary);

  const selectedDetail = document.createElement("article");
  selectedDetail.className = "quality-plan-item quality-plan-selected";

  const renderSelectedWorkout = (workout) => {
    const groupSetLabel = formatQualityGroupSetNote(workout.text);
    const recoveryDistanceLabel = !isQualityTimeTrialPlan(workout.text) ? getQualityRecoveryDistanceLabelFromPlan(workout.text) : "";
    const isTimeTrial = isQualityTimeTrialPlan(workout.text);

    selectedDetail.innerHTML = [
      `<div class="quality-plan-title">${workout.date} ${formatQualityWorkoutPlanText(workout.text)}</div>`,
      isTimeTrial
        ? `<div>${getQualityTimeTrialPaceGuide(workout.text)}</div>`
        : userGroup
        ? `<div>${userGroup.group}조 기준: 인터벌 ${userGroup.intervalPace} / 리커버리 ${userGroup.recoveryPace}</div>`
        : '<div>조별 기준표에서 내 조 페이스를 확인해 주세요.</div>',
      recoveryDistanceLabel ? `<div class="quality-plan-meta">세트 후 리커버리: ${recoveryDistanceLabel} 조깅</div>` : "",
      groupSetLabel ? `<div class="quality-plan-meta">세트 조정: ${groupSetLabel}</div>` : "",
      !isTimeTrial && userGroup?.source === "prediction" ? '<div class="quality-plan-meta">조별 명단에 이름이 없어 최근 기록 기반 예상 조로 안내합니다.</div>' : "",
      '<div class="quality-plan-meta">본 훈련 전 조깅, 질주, 스트레칭으로 충분히 몸을 풀고 진행해 주세요.</div>',
      '<div class="quality-plan-meta">정훈 당일 참석이 어려운 경우 같은 달 안에 해당 프로그램으로 보완 입력할 수 있습니다.</div>',
      '<div class="quality-plan-meta">날짜를 누르면 이 프로그램이 정훈 결과 입력에도 자동으로 들어갑니다.</div>'
    ].filter(Boolean).join("");
  };

  renderSelectedWorkout(upcomingWorkout || schedule.workouts[0]);
  let selectedWorkout = upcomingWorkout || schedule.workouts[0];

  const planList = document.createElement("div");
  planList.className = "quality-plan-list";

  schedule.workouts.forEach((workout) => {
    if (qualityPlanSelect) {
      const option = document.createElement("option");
      option.value = workout.date;
      option.dataset.workout = workout.text;
      option.dataset.type = getQualityWorkoutTypeFromPlan(workout.text);
      option.innerText = `${workout.date} ${formatQualityWorkoutPlanText(workout.text)}`;
      qualityPlanSelect.appendChild(option);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "quality-plan-date";
    button.innerHTML = [
      `<span class="quality-plan-date-day">${workout.date}</span>`,
      `<span class="quality-plan-date-text">${formatQualityWorkoutPlanText(workout.text)}</span>`
    ].join("");
    button.addEventListener("click", () => {
      planList.querySelectorAll(".quality-plan-date").forEach((planButton) => {
        planButton.classList.toggle("active", planButton === button);
      });
      selectedWorkout = workout;
      renderSelectedWorkout(workout);
      syncQualityPlanSelection({
        selectedValue: workout.date,
        resetResults: true
      });
    });

    if (upcomingWorkout && workout.date === upcomingWorkout.date) {
      button.classList.add("active");
    }

    planList.appendChild(button);
  });

  qualityMonthlyPlan.appendChild(planList);
  qualityMonthlyPlan.appendChild(selectedDetail);

  if (!editingQualityRun && currentPlanValue) {
    syncQualityPlanSelection({
      selectedValue: currentPlanValue,
      resetResults: false
    });
  } else if (!editingQualityRun && selectedWorkout) {
    syncQualityPlanSelection({
      selectedValue: selectedWorkout.date,
      resetResults: false
    });
  }
}

function parseQualityWorkoutDate(workoutDate, year = new Date().getFullYear()) {
  const match = String(workoutDate || "").match(/^(\d{1,2})\/(\d{1,2})$/);

  if (!match) return null;

  return new Date(year, Number(match[1]) - 1, Number(match[2]));
}

function getQualityWorkoutEntries(year = new Date().getFullYear()) {
  return Object.values(QUALITY_MONTHLY_SCHEDULE)
    .flatMap((schedule) => schedule.workouts.map((workout) => ({
      ...workout,
      schedule,
      sortDate: parseQualityWorkoutDate(workout.date, year)
    })))
    .filter((workout) => workout.sortDate)
    .sort((a, b) => a.sortDate - b.sortDate);
}

function getUpcomingQualityWorkout(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  const today = new Date(currentYear, referenceDate.getMonth(), referenceDate.getDate());
  const workouts = getQualityWorkoutEntries(currentYear)
    .filter((workout) => workout.sortDate && workout.sortDate >= today)

  return workouts[0] || null;
}

function getQualityNoticeWorkout(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  const now = new Date(referenceDate);

  return getQualityWorkoutEntries(currentYear).find((workout) => {
    const noticeStart = new Date(workout.sortDate);
    const noticeEnd = new Date(workout.sortDate);

    noticeStart.setDate(noticeStart.getDate() - 7);
    noticeStart.setHours(20, 30, 0, 0);
    noticeEnd.setHours(20, 29, 59, 999);

    return now >= noticeStart && now <= noticeEnd;
  }) || null;
}

function createQualityNoticeArticle(workout, userGroup) {
  const article = document.createElement("article");
  const isTimeTrial = isQualityTimeTrialPlan(workout.text);
  const recoveryDistanceLabel = !isTimeTrial ? getQualityRecoveryDistanceLabelFromPlan(workout.text) : "";
  const groupSetLabel = formatQualityGroupSetNote(workout.text);
  const paceGuide = isTimeTrial
    ? getQualityTimeTrialPaceGuide(workout.text)
    : userGroup
      ? `${userGroup.group}조 기준: 인터벌 ${userGroup.intervalPace} / 리커버리 ${userGroup.recoveryPace}`
      : "조별 기준표에서 내 조 페이스를 확인해 주세요.";

  article.className = "quality-plan-item quality-notice";
  article.innerHTML = [
    '<div class="quality-plan-title">다음 정훈 공지</div>',
    `<div>${workout.date} ${formatQualityWorkoutPlanText(workout.text)}</div>`,
    workout.schedule?.purpose ? `<div class="quality-plan-meta">훈련 목적: ${workout.schedule.purpose}</div>` : "",
    `<div class="quality-plan-meta">${paceGuide}</div>`,
    recoveryDistanceLabel ? `<div class="quality-plan-meta">세트 후 리커버리: ${recoveryDistanceLabel} 조깅</div>` : "",
    groupSetLabel ? `<div class="quality-plan-meta">세트 조정: ${groupSetLabel}</div>` : "",
    '<div class="quality-plan-meta">본 훈련 전 조깅, 질주, 스트레칭으로 충분히 몸을 풀고 진행해 주세요.</div>',
    '<div class="quality-plan-meta">정훈 당일 참석이 어려운 경우 같은 달 안에 해당 프로그램으로 보완 입력할 수 있습니다.</div>'
  ].filter(Boolean).join("");
  appendQualityNoticeVotePanel(article, workout);

  return article;
}

function getQualityWorkoutKey(workout) {
  const workoutDate = workout?.sortDate || parseQualityWorkoutDate(workout?.date);

  return workoutDate ? dateToInputValue(workoutDate) : String(workout?.date || "").replace(/[^0-9]/g, "");
}

function appendQualityNoticeVotePanel(article, workout) {
  const panel = document.createElement("div");
  const actions = document.createElement("div");
  const result = document.createElement("div");

  panel.className = "quality-vote-panel";
  actions.className = "quality-vote-actions";
  result.className = "quality-vote-result";
  result.innerText = "참여 현황을 불러오는 중입니다.";

  QUALITY_NOTICE_VOTE_OPTIONS.forEach((option) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "quality-vote-button";
    button.dataset.vote = option.value;
    button.innerText = option.label;
    button.addEventListener("click", () => saveQualityNoticeVote(workout, option.value, article));
    actions.appendChild(button);
  });

  panel.append(actions, result);
  article.appendChild(panel);
  loadQualityNoticeVotes(workout, article);
}

async function saveQualityNoticeVote(workout, voteValue, article) {
  const user = auth.currentUser;

  if (!user) {
    alert("로그인 후 참석 여부를 선택할 수 있습니다.");
    return;
  }

  const voteOption = QUALITY_NOTICE_VOTE_OPTIONS.find((option) => option.value === voteValue);

  if (!voteOption) return;

  const workoutKey = getQualityWorkoutKey(workout);

  try {
    await setDoc(doc(db, "qualityVotes", `${workoutKey}_${user.uid}`), {
      workoutKey,
      workoutDate: workoutKey,
      workoutLabel: `${workout.date} ${formatQualityWorkoutPlanText(workout.text)}`,
      vote: voteValue,
      voteLabel: voteOption.label,
      userId: user.uid,
      name: getUserName(user),
      email: user.email || "",
      updatedAt: new Date()
    }, { merge: true });

    await loadQualityNoticeVotes(workout, article);
  } catch (e) {
    console.error(e);
    alert("참석 여부 저장에 실패했습니다. Firestore 권한을 확인해주세요.");
  }
}

async function loadQualityNoticeVotes(workout, article) {
  const result = article.querySelector(".quality-vote-result");
  const buttons = Array.from(article.querySelectorAll(".quality-vote-button"));
  const user = auth.currentUser;

  if (!result) return;

  const workoutKey = getQualityWorkoutKey(workout);

  try {
    const voteQuery = query(collection(db, "qualityVotes"), where("workoutKey", "==", workoutKey));
    const querySnapshot = await getDocsFromServer(voteQuery);
    const votes = [];

    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      votes.push({
        vote: data.vote || "",
        name: data.name || data.email || "이름 없음",
        userId: data.userId || "",
        updatedAt: data.updatedAt || null
      });
    });

    const myVote = user ? votes.find((vote) => vote.userId === user.uid) : null;

    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.vote === myVote?.vote);
    });

    renderQualityNoticeVoteResult(result, votes);
  } catch (e) {
    console.error(e);
    result.innerText = "참여 현황을 불러오지 못했습니다. Firestore 권한을 확인해주세요.";
  }
}

function renderQualityNoticeVoteResult(result, votes) {
  result.innerHTML = "";

  const summary = document.createElement("div");
  const summaryStrong = document.createElement("strong");

  summaryStrong.innerText = "참여 현황";
  summary.append(summaryStrong, ` 총 ${votes.length}명 응답`);
  result.appendChild(summary);

  QUALITY_NOTICE_VOTE_OPTIONS.forEach((option) => {
    const names = votes
      .filter((vote) => vote.vote === option.value)
      .map((vote) => vote.name);
    const row = document.createElement("div");
    const title = document.createElement("strong");

    title.innerText = option.label;
    row.append(title, ` ${names.length}명${names.length ? `: ${names.join(", ")}` : ""}`);
    result.appendChild(row);
  });
}

function normalizeMemberName(name) {
  return String(name || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/회원님?|러너|님/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .trim();
}

function getRunningGroupStandardPools() {
  return [
    ...runningGroupStandards,
    ...DEFAULT_RUNNING_GROUP_STANDARDS
  ].filter((standard, index, standards) => {
    const key = `${standard.group}-${standard.members}`;
    return standards.findIndex((item) => `${item.group}-${item.members}` === key) === index;
  });
}

function getRunningGroupByMemberName(memberName) {
  const normalizedName = normalizeMemberName(memberName);

  if (!normalizedName) return null;

  return getRunningGroupStandardPools().find((standard) => {
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
  const workoutText = workout ? formatQualityWorkoutPlanText(workout.text) : "화요 정훈 탭의 앞으로의 계획 확인";

  if (workout && isQualityTimeTrialPlan(workout.text)) {
    return `${OFFICIAL_TRAINING_LABEL}: ${workoutText} (${getQualityTimeTrialPaceGuide(workout.text)})`;
  }

  if (group) {
    return `${OFFICIAL_TRAINING_LABEL}: ${workoutText} (${group.group}조 인터벌 ${group.intervalPace})`;
  }

  return `${OFFICIAL_TRAINING_LABEL}: ${workoutText}`;
}

function getOfficialTrainingCommentText(fallbackPredictedTime = null) {
  const workout = getUpcomingQualityWorkout();
  const group = getCurrentUserRunningGroup(fallbackPredictedTime);
  const workoutText = workout ? `${workout.date} ${formatQualityWorkoutPlanText(workout.text)}` : "화요 정훈 탭의 다음 정훈";
  const paceText = workout && isQualityTimeTrialPlan(workout.text)
    ? ` ${getQualityTimeTrialPaceGuide(workout.text)}`
    : group
      ? ` ${group.group}조 기준 ${group.intervalPace}를 참고하세요.`
      : "";

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
    await loadMonthlyAthleteCandidates(user);
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

function getHealingEventTypeLabel(type) {
  const labels = {
    run: "러닝",
    coffee: "커피",
    meal: "식사",
    walk: "산책",
    culture: "문화"
  };
  return labels[type] || "기타";
}

function getHealingEventResponseLabel(response) {
  const labels = {
    attend: "참석",
    maybe: "미정",
    absent: "불참"
  };
  return labels[response] || "미정";
}

function getDateTimeValueMs(value) {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatHealingDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ");
  }
  const month = parsed.getMonth() + 1;
  const date = parsed.getDate();
  const hours = parsed.getHours().toString().padStart(2, "0");
  const minutes = parsed.getMinutes().toString().padStart(2, "0");
  return `${month}/${date} ${hours}:${minutes}`;
}

function formatHealingDate(value) {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function getHealingResponseCounts(eventId) {
  return latestHealingResponses.reduce((counts, response) => {
    if (response.eventId !== eventId) return counts;
    counts[response.response] = (counts[response.response] || 0) + 1;
    return counts;
  }, {
    attend: 0,
    maybe: 0,
    absent: 0
  });
}

function getHealingEventResponses(eventId) {
  return latestHealingResponses.filter((response) => response.eventId === eventId);
}

function canEditHealingEvent(user, event) {
  return Boolean(user && event && (isHostUser(user) || event.userId === user.uid));
}

function syncHealingEventFormVisibility(user = auth.currentUser) {
  if (!healingEventHostForm) return;
  const showForm = Boolean(user);
  healingEventHostForm.classList.toggle("hidden", !showForm);
}

function getHealingCheckinMoodLabel(mood) {
  const labels = {
    good: "좋아요",
    okay: "보통이에요",
    tired: "조금 지쳤어요",
    rest: "회복 중이에요"
  };
  return labels[mood] || "체크인";
}

function setHealingStatus(section, message) {
  const statusMap = {
    event: document.getElementById("healingEventStatus"),
    checkin: document.getElementById("healingCheckinStatus"),
    cheer: document.getElementById("healingCheerStatus")
  };

  const target = statusMap[section];
  if (target) {
    target.innerText = message;
  }
}

async function loadHealingHub(user = auth.currentUser) {
  const eventStatus = document.getElementById("healingEventStatus");
  const checkinStatus = document.getElementById("healingCheckinStatus");
  const cheerStatus = document.getElementById("healingCheerStatus");
  const eventList = document.getElementById("healingEventList");
  const checkinList = document.getElementById("healingCheckinList");
  const cheerList = document.getElementById("healingCheerList");

  if (!eventStatus || !checkinStatus || !cheerStatus || !eventList || !checkinList || !cheerList) return;

  if (!user) {
    latestHealingEvents = [];
    latestHealingResponses = [];
    latestHealingCheckins = [];
    latestHealingCheers = [];
    eventList.innerHTML = "";
    checkinList.innerHTML = "";
    cheerList.innerHTML = "";
    eventStatus.innerText = "로그인 후 힐링 탭을 사용할 수 있습니다.";
    checkinStatus.innerText = "로그인 후 한 줄 체크인을 확인할 수 있습니다.";
    cheerStatus.innerText = "로그인 후 응원 한마디를 확인할 수 있습니다.";
    return;
  }

  eventStatus.innerText = "번개 공지를 불러오는 중입니다.";
  checkinStatus.innerText = "한 줄 체크인을 불러오는 중입니다.";
  cheerStatus.innerText = "응원 한마디를 불러오는 중입니다.";

  try {
    const [eventSnapshot, responseSnapshot, checkinSnapshot, cheerSnapshot] = await Promise.all([
      getDocsFromServer(collection(db, "healingEvents")),
      getDocsFromServer(collection(db, "healingEventResponses")),
      getDocsFromServer(collection(db, "healingCheckins")),
      getDocsFromServer(collection(db, "healingCheers"))
    ]);

    latestHealingEvents = [];
    latestHealingResponses = [];
    latestHealingCheckins = [];
    latestHealingCheers = [];

    eventSnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      latestHealingEvents.push({
        id: snapshotDoc.id,
        title: data.title || "제목 없음",
        type: data.type || "run",
        eventDate: data.eventDate || "",
        location: data.location || "",
        description: data.description || "",
        userId: data.userId || "",
        name: data.name || data.email || "이름 없음",
        email: data.email || "",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
      });
    });

    responseSnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      latestHealingResponses.push({
        id: snapshotDoc.id,
        eventId: data.eventId || "",
        userId: data.userId || "",
        name: data.name || data.email || "이름 없음",
        email: data.email || "",
        response: data.response || "maybe",
        updatedAt: data.updatedAt || null
      });
    });

    checkinSnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      latestHealingCheckins.push({
        id: snapshotDoc.id,
        mood: data.mood || "okay",
        content: data.content || "",
        userId: data.userId || "",
        name: data.name || data.email || "이름 없음",
        email: data.email || "",
        updatedAt: data.updatedAt || null
      });
    });

    cheerSnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      latestHealingCheers.push({
        id: snapshotDoc.id,
        content: data.content || "",
        userId: data.userId || "",
        name: data.name || data.email || "이름 없음",
        email: data.email || "",
        createdAt: data.createdAt || null
      });
    });

    latestHealingEvents.sort((a, b) => getDateTimeValueMs(a.eventDate) - getDateTimeValueMs(b.eventDate));
    latestHealingCheckins.sort((a, b) => getDateTimeValueMs(b.updatedAt) - getDateTimeValueMs(a.updatedAt));
    latestHealingCheers.sort((a, b) => getDateTimeValueMs(b.createdAt) - getDateTimeValueMs(a.createdAt));

    renderHealingHub(user);
  } catch (e) {
    console.error(e);
    eventStatus.innerText = "번개 공지를 불러오지 못했습니다. Firestore 권한을 확인해주세요.";
    checkinStatus.innerText = "한 줄 체크인을 불러오지 못했습니다. Firestore 권한을 확인해주세요.";
    cheerStatus.innerText = "응원 한마디를 불러오지 못했습니다. Firestore 권한을 확인해주세요.";
  }
}

function renderHealingHub(user = auth.currentUser) {
  renderHealingEvents(user);
  renderHealingCheckins(user);
  renderHealingCheers(user);
}

function isEditingHealingEventId(eventId) {
  return Boolean(editingHealingEvent?.id && editingHealingEvent.id === eventId);
}

function isEditingHealingCheckinId(checkinId) {
  return Boolean(editingHealingCheckin?.id && editingHealingCheckin.id === checkinId);
}

function isEditingHealingCheerId(cheerId) {
  return Boolean(editingHealingCheer?.id && editingHealingCheer.id === cheerId);
}

function focusHealingForm(formId, inputId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    input?.focus();
    if (typeof input?.select === "function") {
      input.select();
    }
  }, 180);
}

function resetHealingEventForm() {
  editingHealingEvent = null;
  if (healingEventTitleInput) healingEventTitleInput.value = "";
  if (healingEventTypeSelect) healingEventTypeSelect.value = "run";
  if (healingEventDateInput) healingEventDateInput.value = "";
  if (healingEventLocationInput) healingEventLocationInput.value = "";
  if (healingEventDescriptionInput) healingEventDescriptionInput.value = "";
  if (saveHealingEventBtn) saveHealingEventBtn.innerText = "번개 등록";
  document.getElementById("cancelHealingEventEdit")?.classList.add("hidden");
  syncHealingEventFormVisibility(auth.currentUser);
  renderHealingHub(auth.currentUser);
}

function startHealingEventEdit(event) {
  editingHealingEvent = event;
  if (healingEventTitleInput) healingEventTitleInput.value = event.title || "";
  if (healingEventTypeSelect) healingEventTypeSelect.value = event.type || "run";
  if (healingEventDateInput) healingEventDateInput.value = event.eventDate || "";
  if (healingEventLocationInput) healingEventLocationInput.value = event.location || "";
  if (healingEventDescriptionInput) healingEventDescriptionInput.value = event.description || "";
  if (saveHealingEventBtn) saveHealingEventBtn.innerText = "번개 수정";
  document.getElementById("cancelHealingEventEdit")?.classList.remove("hidden");
  syncHealingEventFormVisibility(auth.currentUser);
  renderHealingHub(auth.currentUser);
  setHealingStatus("event", "번개 내용을 수정한 뒤 저장해주세요.");
  focusHealingForm("healingEventHostForm", "healingEventTitle");
}

function resetHealingCheckinForm() {
  editingHealingCheckin = null;
  if (healingCheckinMoodInput) healingCheckinMoodInput.value = "good";
  if (healingCheckinContentInput) healingCheckinContentInput.value = "";
  if (saveHealingCheckinBtn) saveHealingCheckinBtn.innerText = "체크인 남기기";
  document.getElementById("cancelHealingCheckinEdit")?.classList.add("hidden");
  renderHealingHub(auth.currentUser);
}

function startHealingCheckinEdit(checkin) {
  editingHealingCheckin = checkin;
  if (healingCheckinMoodInput) healingCheckinMoodInput.value = checkin.mood || "good";
  if (healingCheckinContentInput) healingCheckinContentInput.value = checkin.content || "";
  if (saveHealingCheckinBtn) saveHealingCheckinBtn.innerText = "체크인 수정";
  document.getElementById("cancelHealingCheckinEdit")?.classList.remove("hidden");
  renderHealingHub(auth.currentUser);
  setHealingStatus("checkin", "체크인을 수정한 뒤 저장해주세요.");
  focusHealingForm("healingCheckinForm", "healingCheckinContent");
}

function resetHealingCheerForm() {
  editingHealingCheer = null;
  if (healingCheerContentInput) healingCheerContentInput.value = "";
  if (saveHealingCheerBtn) saveHealingCheerBtn.innerText = "응원 남기기";
  document.getElementById("cancelHealingCheerEdit")?.classList.add("hidden");
  renderHealingHub(auth.currentUser);
}

function startHealingCheerEdit(cheer) {
  editingHealingCheer = cheer;
  if (healingCheerContentInput) healingCheerContentInput.value = cheer.content || "";
  if (saveHealingCheerBtn) saveHealingCheerBtn.innerText = "응원 수정";
  document.getElementById("cancelHealingCheerEdit")?.classList.remove("hidden");
  renderHealingHub(auth.currentUser);
  setHealingStatus("cheer", "응원 내용을 수정한 뒤 저장해주세요.");
  focusHealingForm("healingCheerForm", "healingCheerContent");
}

function handleHealingEventListClick(event) {
  const button = event.target.closest("button[data-healing-action]");
  if (!button) return;

  const action = button.dataset.healingAction;
  const eventId = button.dataset.eventId;
  const targetEvent = latestHealingEvents.find((item) => item.id === eventId);

  if (action === "respond" && targetEvent) {
    saveHealingEventResponse(targetEvent, button.dataset.response || "maybe");
    return;
  }

  if (action === "edit" && targetEvent) {
    startHealingEventEdit(targetEvent);
    return;
  }

  if (action === "delete" && targetEvent) {
    deleteHealingEvent(targetEvent);
  }
}

function handleHealingCheckinListClick(event) {
  const button = event.target.closest("button[data-healing-action]");
  if (!button) return;

  const action = button.dataset.healingAction;
  const checkinId = button.dataset.checkinId;
  const targetCheckin = latestHealingCheckins.find((item) => item.id === checkinId);

  if (action === "edit" && targetCheckin) {
    startHealingCheckinEdit(targetCheckin);
    return;
  }

  if (action === "delete" && targetCheckin) {
    deleteHealingCheckin(targetCheckin);
  }
}

function handleHealingCheerListClick(event) {
  const button = event.target.closest("button[data-healing-action]");
  if (!button) return;

  const action = button.dataset.healingAction;
  const cheerId = button.dataset.cheerId;
  const targetCheer = latestHealingCheers.find((item) => item.id === cheerId);

  if (action === "edit" && targetCheer) {
    startHealingCheerEdit(targetCheer);
    return;
  }

  if (action === "delete" && targetCheer) {
    deleteHealingCheer(targetCheer);
  }
}

function renderHealingEvents(user = auth.currentUser) {
  const eventStatus = document.getElementById("healingEventStatus");
  const eventList = document.getElementById("healingEventList");

  if (!eventStatus || !eventList) return;

  eventList.innerHTML = "";

  if (!latestHealingEvents.length) {
    eventStatus.innerText = "아직 등록된 번개가 없습니다.";
    eventList.innerHTML = '<div class="healing-empty">가볍게 함께할 번개를 기다리고 있어요.</div>';
    return;
  }

  eventStatus.innerText = `${latestHealingEvents.length}개 번개 공지`;

  latestHealingEvents.forEach((event) => {
    const responses = getHealingEventResponses(event.id);
    const counts = getHealingResponseCounts(event.id);
    const myResponse = responses.find((response) => response.userId === user?.uid)?.response || "";
    const attendNames = responses.filter((response) => response.response === "attend").map((response) => response.name);
    const maybeNames = responses.filter((response) => response.response === "maybe").map((response) => response.name);
    const absentNames = responses.filter((response) => response.response === "absent").map((response) => response.name);

    const card = document.createElement("article");
    card.className = "suggestion-card";
    if (isEditingHealingEventId(event.id)) {
      card.classList.add("healing-card-editing");
    }

    const title = document.createElement("div");
    title.className = "suggestion-title";
    title.innerText = event.title;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "healing-card-meta";
    meta.innerText = `${getHealingEventTypeLabel(event.type)} · ${formatHealingDateTime(event.eventDate)} · ${event.location || "장소 추후 안내"}`;
    card.appendChild(meta);

    if (event.description) {
      const body = document.createElement("div");
      body.className = "suggestion-body";
      body.innerText = event.description;
      card.appendChild(body);
    }

    const pillRow = document.createElement("div");
    pillRow.className = "healing-pill-row";
    [`참석 ${counts.attend}`, `미정 ${counts.maybe}`, `불참 ${counts.absent}`].forEach((label) => {
      const pill = document.createElement("span");
      pill.className = "healing-pill";
      pill.innerText = label;
      pillRow.appendChild(pill);
    });
    card.appendChild(pillRow);

    if (attendNames.length || maybeNames.length || absentNames.length) {
      const attendee = document.createElement("div");
      attendee.className = "suggestion-body";
      attendee.innerText = [
        attendNames.length ? `참석: ${attendNames.join(", ")}` : "",
        maybeNames.length ? `미정: ${maybeNames.join(", ")}` : "",
        absentNames.length ? `불참: ${absentNames.join(", ")}` : ""
      ].filter(Boolean).join("\n");
      card.appendChild(attendee);
    }

    const actionRow = document.createElement("div");
    actionRow.className = "healing-action-row";
    [
      { value: "attend", label: "참석" },
      { value: "maybe", label: "미정" },
      { value: "absent", label: "불참" }
    ].forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = myResponse === option.value ? "button-secondary" : "table-action";
      button.dataset.healingAction = "respond";
      button.dataset.eventId = event.id;
      button.dataset.response = option.value;
      button.innerText = myResponse === option.value
        ? `${getHealingEventResponseLabel(option.value)} 선택됨`
        : getHealingEventResponseLabel(option.value);
      actionRow.appendChild(button);
    });

    if (canEditHealingEvent(user, event)) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = `${isEditingHealingEventId(event.id) ? "table-action" : "button-secondary table-action"}`;
      editButton.dataset.healingAction = "edit";
      editButton.dataset.eventId = event.id;
      editButton.innerText = isEditingHealingEventId(event.id) ? "수정 중" : "수정";
      actionRow.appendChild(editButton);
    }

    if (isHostUser(user)) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "button-danger table-action";
      deleteButton.dataset.healingAction = "delete";
      deleteButton.dataset.eventId = event.id;
      deleteButton.innerText = "삭제";
      actionRow.appendChild(deleteButton);
    }

    card.appendChild(actionRow);
    eventList.appendChild(card);
  });
}

function renderHealingCheckins(user = auth.currentUser) {
  const checkinStatus = document.getElementById("healingCheckinStatus");
  const checkinList = document.getElementById("healingCheckinList");

  if (!checkinStatus || !checkinList) return;

  checkinList.innerHTML = "";

  if (!latestHealingCheckins.length) {
    checkinStatus.innerText = "아직 등록된 한 줄 체크인이 없습니다.";
    checkinList.innerHTML = '<div class="healing-empty">러닝한 날도, 쉬는 날도 괜찮아요. 오늘의 상태를 짧게 남겨주세요.</div>';
    return;
  }

  checkinStatus.innerText = `${latestHealingCheckins.length}개의 한 줄 체크인`;

  latestHealingCheckins.forEach((checkin) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";
    if (isEditingHealingCheckinId(checkin.id)) {
      card.classList.add("healing-card-editing");
    }

    const meta = document.createElement("div");
    meta.className = "healing-card-meta";
    meta.innerText = `${checkin.name} · ${getHealingCheckinMoodLabel(checkin.mood)} · ${formatSavedDateTime(checkin.updatedAt) || "-"}`;
    card.appendChild(meta);

    if (checkin.content) {
      const body = document.createElement("div");
      body.className = "suggestion-body";
      body.innerText = checkin.content;
      card.appendChild(body);
    }

    if (user && (isHostUser(user) || checkin.userId === user.uid)) {
      const actionRow = document.createElement("div");
      actionRow.className = "healing-action-row";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = `${isEditingHealingCheckinId(checkin.id) ? "table-action" : "button-secondary table-action"}`;
      editButton.dataset.healingAction = "edit";
      editButton.dataset.checkinId = checkin.id;
      editButton.innerText = isEditingHealingCheckinId(checkin.id) ? "수정 중" : "수정";
      actionRow.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "button-danger table-action";
      deleteButton.dataset.healingAction = "delete";
      deleteButton.dataset.checkinId = checkin.id;
      deleteButton.innerText = "삭제";
      actionRow.appendChild(deleteButton);
      card.appendChild(actionRow);
    }

    checkinList.appendChild(card);
  });
}

function renderHealingCheers(user = auth.currentUser) {
  const cheerStatus = document.getElementById("healingCheerStatus");
  const cheerList = document.getElementById("healingCheerList");

  if (!cheerStatus || !cheerList) return;

  cheerList.innerHTML = "";

  if (!latestHealingCheers.length) {
    cheerStatus.innerText = "첫 응원 한마디를 남겨주세요.";
    cheerList.innerHTML = '<div class="healing-empty">오늘 수고한 회원들에게 짧은 응원을 남겨보세요.</div>';
    return;
  }

  cheerStatus.innerText = `${latestHealingCheers.length}개의 응원 한마디`;

  latestHealingCheers.forEach((cheer) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";
    if (isEditingHealingCheerId(cheer.id)) {
      card.classList.add("healing-card-editing");
    }

    const meta = document.createElement("div");
    meta.className = "healing-card-meta";
    meta.innerText = `${cheer.name} · ${formatSavedDateTime(cheer.createdAt) || "-"}`;
    card.appendChild(meta);

    const body = document.createElement("div");
    body.className = "suggestion-body";
    body.innerText = cheer.content;
    card.appendChild(body);

    if (user && (isHostUser(user) || cheer.userId === user.uid)) {
      const actionRow = document.createElement("div");
      actionRow.className = "healing-action-row";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = `${isEditingHealingCheerId(cheer.id) ? "table-action" : "button-secondary table-action"}`;
      editButton.dataset.healingAction = "edit";
      editButton.dataset.cheerId = cheer.id;
      editButton.innerText = isEditingHealingCheerId(cheer.id) ? "수정 중" : "수정";
      actionRow.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "button-danger table-action";
      deleteButton.dataset.healingAction = "delete";
      deleteButton.dataset.cheerId = cheer.id;
      deleteButton.innerText = "삭제";
      actionRow.appendChild(deleteButton);
      card.appendChild(actionRow);
    }

    cheerList.appendChild(card);
  });
}

async function saveHealingEvent() {
  const user = auth.currentUser;
  const isEditing = Boolean(editingHealingEvent?.id);

  if (!user) {
    setHealingStatus("event", "로그인 후 번개 공지를 작성하거나 수정할 수 있습니다.");
    return;
  }

  if (!isEditing && !user) {
    setHealingStatus("event", "로그인 후 번개 공지를 등록할 수 있습니다.");
    return;
  }

  if (isEditing && !canEditHealingEvent(user, editingHealingEvent)) {
    setHealingStatus("event", "작성자 본인 또는 호스트만 번개를 수정할 수 있습니다.");
    return;
  }

  const title = document.getElementById("healingEventTitle")?.value.trim() || "";
  const type = document.getElementById("healingEventType")?.value || "run";
  const eventDate = document.getElementById("healingEventDate")?.value || "";
  const location = document.getElementById("healingEventLocation")?.value.trim() || "";
  const description = document.getElementById("healingEventDescription")?.value.trim() || "";

  if (!title) {
    setHealingStatus("event", "번개 제목을 입력해주세요.");
    return;
  }

  if (!eventDate) {
    setHealingStatus("event", "모임 일정을 입력해주세요.");
    return;
  }

  const saveButton = document.getElementById("saveHealingEvent");
  if (saveButton) saveButton.disabled = true;

  try {
    if (isEditing) {
      await updateDoc(doc(db, "healingEvents", editingHealingEvent.id), {
        title,
        type,
        eventDate,
        location,
        description,
        userId: editingHealingEvent.userId,
        name: editingHealingEvent.name,
        email: editingHealingEvent.email,
        createdAt: editingHealingEvent.createdAt || new Date(),
        updatedAt: new Date()
      });
    } else {
      await addDoc(collection(db, "healingEvents"), {
        title,
        type,
        eventDate,
        location,
        description,
        userId: user.uid,
        name: getUserName(user),
        email: user.email,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    resetHealingEventForm();
    await loadHealingHub(user);
    setHealingStatus("event", isEditing ? "번개 공지를 수정했습니다." : "번개 공지를 등록했습니다.");
  } catch (e) {
    console.error(e);
    setHealingStatus("event", editingHealingEvent?.id
      ? "번개 공지 수정이 되지 않았습니다. 잠시 후 다시 시도해주세요."
      : "번개 공지 등록이 되지 않았습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

async function saveHealingEventResponse(event, response) {
  const user = auth.currentUser;

  if (!user) {
    setHealingStatus("event", "로그인 후 참여 상태를 남길 수 있습니다.");
    return;
  }

  try {
    await setDoc(doc(db, "healingEventResponses", `${event.id}_${user.uid}`), {
      eventId: event.id,
      userId: user.uid,
      name: getUserName(user),
      email: user.email,
      response,
      updatedAt: new Date()
    });
    await loadHealingHub(user);
    setHealingStatus("event", `${event.title} 번개에 ${getHealingEventResponseLabel(response)}로 표시했습니다.`);
  } catch (e) {
    console.error(e);
    setHealingStatus("event", "참여 상태 저장이 되지 않았습니다. 잠시 후 다시 시도해주세요.");
  }
}

async function deleteHealingEvent(event) {
  const user = auth.currentUser;

  if (!isHostUser(user)) {
    setHealingStatus("event", "호스트 계정에서만 번개를 삭제할 수 있습니다.");
    return;
  }

  if (!confirm(`"${event.title}" 번개를 삭제할까요?`)) return;

  try {
    await deleteDoc(doc(db, "healingEvents", event.id));
    await loadHealingHub(user);
    setHealingStatus("event", "번개를 삭제했습니다.");
  } catch (e) {
    console.error(e);
    setHealingStatus("event", "번개 삭제가 되지 않았습니다. 잠시 후 다시 시도해주세요.");
  }
}

async function saveHealingCheckin() {
  const user = auth.currentUser;

  if (!user) {
    setHealingStatus("checkin", "로그인 후 체크인을 남길 수 있습니다.");
    return;
  }

  const mood = document.getElementById("healingCheckinMood")?.value || "okay";
  const content = document.getElementById("healingCheckinContent")?.value.trim() || "";

  if (!content) {
    setHealingStatus("checkin", "체크인 내용을 입력해주세요.");
    return;
  }

  const saveButton = document.getElementById("saveHealingCheckin");
  if (saveButton) saveButton.disabled = true;

  try {
    const isEditing = Boolean(editingHealingCheckin?.id);
    if (isEditing) {
      await updateDoc(doc(db, "healingCheckins", editingHealingCheckin.id), {
        mood,
        content,
        userId: editingHealingCheckin.userId || user.uid,
        name: editingHealingCheckin.name || getUserName(user),
        email: editingHealingCheckin.email || user.email,
        updatedAt: new Date()
      });
    } else {
      await addDoc(collection(db, "healingCheckins"), {
        mood,
        content,
        userId: user.uid,
        name: getUserName(user),
        email: user.email,
        updatedAt: new Date()
      });
    }

    resetHealingCheckinForm();
    await loadHealingHub(user);
    setHealingStatus("checkin", isEditing ? "한 줄 체크인을 수정했습니다." : "한 줄 체크인을 남겼습니다.");
  } catch (e) {
    console.error(e);
    setHealingStatus("checkin", editingHealingCheckin?.id
      ? "체크인 수정이 되지 않았습니다. 잠시 후 다시 시도해주세요."
      : "체크인 등록이 되지 않았습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

async function deleteHealingCheckin(checkin) {
  const user = auth.currentUser;

  if (!user || (!isHostUser(user) && checkin.userId !== user.uid)) {
    setHealingStatus("checkin", "본인 체크인 또는 호스트 계정에서만 삭제할 수 있습니다.");
    return;
  }

  if (!confirm("이 체크인을 삭제할까요?")) return;

  try {
    await deleteDoc(doc(db, "healingCheckins", checkin.id));
    await loadHealingHub(user);
    setHealingStatus("checkin", "체크인을 삭제했습니다.");
  } catch (e) {
    console.error(e);
    setHealingStatus("checkin", "체크인 삭제가 되지 않았습니다. 잠시 후 다시 시도해주세요.");
  }
}

async function saveHealingCheer() {
  const user = auth.currentUser;

  if (!user) {
    setHealingStatus("cheer", "로그인 후 응원을 남길 수 있습니다.");
    return;
  }

  const content = document.getElementById("healingCheerContent")?.value.trim() || "";

  if (!content) {
    setHealingStatus("cheer", "응원 내용을 입력해주세요.");
    return;
  }

  const saveButton = document.getElementById("saveHealingCheer");
  if (saveButton) saveButton.disabled = true;

  try {
    const isEditing = Boolean(editingHealingCheer?.id);
    if (isEditing) {
      await updateDoc(doc(db, "healingCheers", editingHealingCheer.id), {
        content,
        userId: editingHealingCheer.userId || user.uid,
        name: editingHealingCheer.name || getUserName(user),
        email: editingHealingCheer.email || user.email,
        createdAt: editingHealingCheer.createdAt || new Date(),
        updatedAt: new Date()
      });
    } else {
      await addDoc(collection(db, "healingCheers"), {
        content,
        userId: user.uid,
        name: getUserName(user),
        email: user.email,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    resetHealingCheerForm();
    await loadHealingHub(user);
    setHealingStatus("cheer", isEditing ? "응원 한마디를 수정했습니다." : "응원 한마디를 남겼습니다.");
  } catch (e) {
    console.error(e);
    setHealingStatus("cheer", editingHealingCheer?.id
      ? "응원 수정이 되지 않았습니다. 잠시 후 다시 시도해주세요."
      : "응원 등록이 되지 않았습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

async function deleteHealingCheer(cheer) {
  const user = auth.currentUser;

  if (!user || (!isHostUser(user) && cheer.userId !== user.uid)) {
    setHealingStatus("cheer", "본인 응원 또는 호스트 계정에서만 삭제할 수 있습니다.");
    return;
  }

  if (!confirm("이 응원을 삭제할까요?")) return;

  try {
    await deleteDoc(doc(db, "healingCheers", cheer.id));
    await loadHealingHub(user);
    setHealingStatus("cheer", "응원을 삭제했습니다.");
  } catch (e) {
    console.error(e);
    setHealingStatus("cheer", "응원 삭제가 되지 않았습니다. 잠시 후 다시 시도해주세요.");
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
      tr.dataset.memberUserId = member.userId;
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
        loadMemberRuns(member, tr);
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
  memberRunsLoadId += 1;
  editingRun = null;

  const panel = document.getElementById("memberRunsPanel");
  const title = document.getElementById("memberRunsTitle");
  const status = document.getElementById("memberRunsStatus");
  const list = document.getElementById("memberRunsList");

  document.querySelectorAll(".member-row-selected").forEach((row) => {
    row.classList.remove("member-row-selected");
  });
  document.querySelectorAll(".member-runs-row").forEach((row) => {
    row.remove();
  });

  if (panel) panel.classList.add("hidden");
  if (title) title.innerText = "회원 기록";
  if (status) status.innerText = "회원을 선택하면 기록을 확인할 수 있습니다.";
  if (list) list.innerHTML = "";
  updateRunFormMode();
}

function getMemberRunsPanel() {
  let panel = document.getElementById("memberRunsPanel");

  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "memberRunsPanel";
  panel.className = "member-runs-panel hidden";
  panel.innerHTML = `
    <h3 id="memberRunsTitle">회원 기록</h3>
    <div id="memberRunsStatus" class="goal-status">회원을 선택하면 기록을 확인할 수 있습니다.</div>
    <div class="table-wrap">
      <table class="run-record-table">
        <thead>
          <tr>
            <th>운동일</th>
            <th>구분</th>
            <th>거리</th>
            <th>시간</th>
            <th>페이스</th>
            <th>훈련내용/대회명</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody id="memberRunsList"></tbody>
      </table>
    </div>
  `;

  return panel;
}

function moveMemberRunsPanelBelow(member, memberRow = null) {
  const memberList = document.getElementById("memberList");
  const panel = getMemberRunsPanel();

  if (!memberList || !panel) return panel;

  const targetRow = memberRow || Array.from(memberList.querySelectorAll("tr[data-member-user-id]"))
    .find((row) => row.dataset.memberUserId === member.userId);

  document.querySelectorAll(".member-row-selected").forEach((row) => {
    row.classList.remove("member-row-selected");
  });
  document.querySelectorAll(".member-runs-row").forEach((row) => {
    row.remove();
  });

  if (!targetRow) return panel;

  targetRow.classList.add("member-row-selected");

  const detailRow = document.createElement("tr");
  detailRow.className = "member-runs-row";
  const detailCell = document.createElement("td");
  detailCell.colSpan = targetRow.children.length || 4;
  detailCell.appendChild(panel);
  detailRow.appendChild(detailCell);
  targetRow.insertAdjacentElement("afterend", detailRow);

  return panel;
}

async function loadMemberRuns(member, memberRow = null) {
  const user = auth.currentUser;
  const panel = moveMemberRunsPanelBelow(member, memberRow);
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
  const requestId = ++memberRunsLoadId;
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

    if (requestId !== memberRunsLoadId) return;

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
    rankingEligible: getSavedRankingEligibility(data),
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
    await loadMonthlyAthleteCandidates(user);
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

function getTodayRuns(runs) {
  const todayKey = getTodayDateString();

  return runs.filter((run) => getDateKey(run.runDate) === todayKey);
}

function getEnvironmentRecommendationLevel(environment = latestEnvironment) {
  if (!environment) {
    return {
      level: "unknown",
      reason: ""
    };
  }

  const reasons = [];
  const hasBadDust = environment.pm10Grade?.label === "나쁨"
    || environment.pm10Grade?.label === "매우 나쁨"
    || environment.pm25Grade?.label === "나쁨"
    || environment.pm25Grade?.label === "매우 나쁨";
  const hasModerateDust = environment.pm10Grade?.label === "보통" || environment.pm25Grade?.label === "보통";
  const hasRainRisk = environment.hasRainOrStorm || environment.maxPrecipitationProbability >= 70;
  const hasModerateRainRisk = environment.maxPrecipitationProbability >= 40;

  if (hasBadDust) reasons.push("미세먼지");
  if (hasRainRisk) reasons.push("비 예보");
  if (Number.isFinite(environment.temperature) && environment.temperature >= 32) reasons.push("고온");
  if (Number.isFinite(environment.temperature) && environment.temperature <= -5) reasons.push("한파");

  if (reasons.length) {
    return {
      level: "avoid",
      reason: reasons.join(", ")
    };
  }

  if (hasModerateDust) reasons.push("보통 수준 미세먼지");
  if (hasModerateRainRisk) reasons.push("비 가능성");
  if (Number.isFinite(environment.temperature) && environment.temperature >= 28) reasons.push("더위");
  if (Number.isFinite(environment.temperature) && environment.temperature <= 0) reasons.push("추위");
  if (Number.isFinite(environment.humidity) && environment.humidity >= 85) reasons.push("높은 습도");

  return {
    level: reasons.length ? "caution" : "good",
    reason: reasons.join(", ")
  };
}

function getRecoveryRecommendation(todayStats, hasQualityToday) {
  const recoveryReason = hasQualityToday
    ? "오늘 정훈 기록이 들어왔어요."
    : `오늘 ${formatMileage(todayStats.totalDistance)}를 이미 채웠어요.`;

  return getFriendlyMessage([
    `${recoveryReason} 추가 훈련보다 회복이 더 좋겠습니다. 하체 스트레칭, 폼롤러, 수분 보충으로 마무리해 주세요.`,
    `${recoveryReason} 오늘의 남은 숙제는 회복입니다. 가벼운 걷기와 종아리, 햄스트링 스트레칭을 추천해요.`,
    `${recoveryReason} 더 밀어붙이기보다 단백질과 탄수화물을 챙기고 다리를 부드럽게 풀어주세요.`
  ], `daily-done-${Math.round(todayStats.totalDistance * 10)}-${Math.round(todayStats.totalTime)}`);
}

function getWeatherLimitedRecommendation(environmentLevel) {
  if (environmentLevel.level === "avoid") {
    return getFriendlyMessage([
      `오늘은 ${environmentLevel.reason} 때문에 야외 러닝 강도를 낮추는 게 좋겠습니다. 실내 근력, 스트레칭, 폼롤러로 대체해 주세요.`,
      `${environmentLevel.reason} 조건이 좋지 않아요. 러닝은 쉬고, 20분 가벼운 코어와 하체 가동성 루틴을 추천합니다.`,
      `오늘 야외 러닝은 무리하지 않는 쪽이 좋겠습니다. ${environmentLevel.reason}을 고려해 휴식과 영양 보충을 우선해 주세요.`
    ], `daily-weather-avoid-${environmentLevel.reason}`);
  }

  if (environmentLevel.level === "caution") {
    return getFriendlyMessage([
      `${environmentLevel.reason}이 있어요. 오늘은 대화 가능한 페이스로 30~40분 이내 가볍게 가는 편이 좋겠습니다.`,
      `날씨 조건을 감안하면 강도 훈련보다 이지런이 맞아요. ${environmentLevel.reason}을 체크하고 5km 안팎으로 편하게 달려주세요.`,
      `${environmentLevel.reason} 때문에 욕심은 줄이는 날입니다. 짧은 조깅 뒤 스트레칭으로 마무리해 주세요.`
    ], `daily-weather-caution-${environmentLevel.reason}`);
  }

  return "";
}

function getQualityWorkoutForDate(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dateKey = getDateKey(dateToInputValue(date));
  const workouts = QUALITY_MONTHLY_SCHEDULE[month]?.workouts || [];

  return workouts.find((workout) => {
    const workoutDate = parseQualityWorkoutDate(workout.date, year);
    return workoutDate && getDateKey(workoutDate) === dateKey;
  }) || null;
}

function getQualityDayRecommendation(workout, environmentLevel) {
  if (!workout) return "";

  const workoutText = formatQualityWorkoutPlanText(workout.text);
  const isTimeTrial = isQualityTimeTrialPlan(workout.text);
  const qualityGuide = isTimeTrial
    ? getQualityTimeTrialPaceGuide(workout.text)
    : "목표 페이스보다 5~10초/km 여유 있게 시작하고, 세트 사이 리커버리를 충분히 가져가세요.";
  const hasDust = String(environmentLevel.reason || "").includes("미세먼지");
  const hasRain = String(environmentLevel.reason || "").includes("비");
  const safetyNotes = [
    hasDust ? "미세먼지가 좋지 않으면 마스크 착용을 권장합니다." : "",
    hasRain ? "비가 오거나 노면이 젖어 있으면 미끄럼과 시야를 먼저 확인해 주세요." : "",
    "호흡 답답함, 목 따가움, 기침, 가슴 불편감, 두통이 있으면 즉시 강도를 낮추거나 중단해 주세요."
  ].filter(Boolean).join(" ");

  if (environmentLevel.level === "avoid") {
    return getFriendlyMessage([
      `오늘은 화요 정훈일입니다. ${workoutText} 예정이지만 ${environmentLevel.reason} 영향이 있어요. 정훈 참여 의지는 존중하되, ${qualityGuide} 컨디션이 불편하면 세트 수를 1~2개 줄여도 됩니다. ${safetyNotes}`,
      `정훈은 지키되 안전장치를 넣는 날입니다. 오늘 프로그램은 ${workoutText}이고, ${environmentLevel.reason} 때문에 초반부터 무리하지 않는 쪽이 좋겠습니다. ${qualityGuide} 불편 신호가 있으면 이지런이나 회복으로 전환해 주세요. ${safetyNotes}`,
      `오늘 정훈 ${workoutText}는 진행하더라도 평소보다 보수적으로 잡아주세요. ${environmentLevel.reason} 조건에서는 기록 욕심보다 완주와 안전이 우선입니다. ${qualityGuide} ${safetyNotes}`
    ], `daily-quality-avoid-${workout.date}-${environmentLevel.reason}`);
  }

  if (environmentLevel.level === "caution") {
    return getFriendlyMessage([
      `오늘은 화요 정훈일입니다. ${workoutText}를 진행하되 ${environmentLevel.reason}을 고려해 워밍업을 길게 하고 초반 강도를 낮춰 주세요. ${qualityGuide}`,
      `정훈 참여하기 좋은 마음은 살리고, 조건은 조금 조절해요. 오늘은 ${workoutText}, ${environmentLevel.reason}이 있으니 리커버리를 넉넉히 가져가면 좋겠습니다.`,
      `오늘 정훈은 ${workoutText}입니다. ${environmentLevel.reason}이 있어 평소보다 한 단계 여유 있게 시작하고, 몸 상태가 괜찮을 때만 후반에 올려주세요.`
    ], `daily-quality-caution-${workout.date}-${environmentLevel.reason}`);
  }

  return getFriendlyMessage([
    `오늘은 화요 정훈일입니다. ${workoutText}를 중심 훈련으로 가져가세요. ${qualityGuide}`,
    `오늘의 핵심은 정훈입니다. ${workoutText}를 안정적으로 수행하고, 끝나면 쿨다운과 수분 보충까지 챙겨주세요.`,
    `정훈날입니다. ${workoutText}를 무리 없이 소화하는 걸 목표로 잡고, 첫 세트는 여유 있게 들어가세요.`
  ], `daily-quality-${workout.date}`);
}

function updateDailyRecommendation(runs) {
  const dailyRecommendation = document.getElementById("dailyRecommendation");

  if (!dailyRecommendation) return;

  const todayRuns = getTodayRuns(runs);
  const todayStats = calculateRunStats(todayRuns);
  const hasQualityToday = todayRuns.some(isQualityWorkout);
  const hasEnoughToday = todayStats.totalDistance >= 5 || todayStats.totalTime >= 30 || hasQualityToday;
  const environmentLevel = getEnvironmentRecommendationLevel();
  const todayQualityWorkout = getQualityWorkoutForDate();
  const qualityDayRecommendation = getQualityDayRecommendation(todayQualityWorkout, environmentLevel);
  const weatherRecommendation = getWeatherLimitedRecommendation(environmentLevel);

  if (hasEnoughToday) {
    dailyRecommendation.innerText = getRecoveryRecommendation(todayStats, hasQualityToday);
    return;
  }

  if (qualityDayRecommendation) {
    dailyRecommendation.innerText = qualityDayRecommendation;
    return;
  }

  if (weatherRecommendation) {
    dailyRecommendation.innerText = weatherRecommendation;
    return;
  }

  if (!runs.length) {
    dailyRecommendation.innerText = getFriendlyMessage([
      "오늘은 기록보다 산책 같은 조깅으로 시작해봐요. 20~30분이면 충분하고, 마무리는 스트레칭까지 챙겨주세요.",
      "첫 기록은 가볍게 남기는 게 제일 좋아요. 숨이 편한 속도로 20분만 다녀오고 수분을 보충해 주세요.",
      "오늘의 목표는 멋진 기록보다 문밖으로 나가기. 편한 조깅 20~30분과 가벼운 하체 스트레칭을 추천해요."
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
      "이번 주는 이미 꽤 잘 쌓았어요. 오늘은 회복 조깅이나 휴식, 폼롤러로 다음 훈련을 살려두면 좋겠습니다.",
      "몸에 적립한 마일리지가 충분해요. 오늘은 30분 이내 아주 편한 조깅, 아니면 스트레칭만 해도 좋습니다.",
      "잘 달린 주간입니다. 오늘 더 밀어붙이기보다 다리를 가볍게 풀고 단백질과 수분을 챙겨주세요."
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

function getMonthChallengeRangeText(monthKey = getCurrentMonthKey()) {
  const [year, month] = monthKey.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date();

  endDate.setHours(23, 59, 59, 999);

  return `${formatChartDate(dateToInputValue(startDate))}~${formatChartDate(dateToInputValue(endDate))}`;
}

function getMemberChallengeGroup(name) {
  const group = getRunningGroupByMemberName(name);

  return group?.group || "미배정";
}

function getSelectedChallengeGroup() {
  return document.getElementById("monthlyChallengeGroup")?.value || "all";
}

function getChallengeGroupLabel(groupValue) {
  if (!groupValue || groupValue === "all") return "전체";
  if (groupValue === "unassigned") return "미배정";
  return `${groupValue}조`;
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
  renderPersonalBestItem("pb5k", pb["5K"]);
  renderPersonalBestItem("pb10k", pb["10K"]);
  renderPersonalBestItem("pbHalf", pb["HALF"]);
  renderPersonalBestItem("pbFull", pb["FULL"]);
}

function renderPersonalBestItem(elementId, record) {
  const element = document.getElementById(elementId);

  if (!element) return;

  if (!record) {
    element.innerText = "-";
    return;
  }

  const dateText = record.runDate ? `${formatKoreanDate(record.runDate)} 달성` : "달성일 미기록";

  element.innerHTML = [
    `<span class="pb-record">${formatTime(record.time)} (${formatPace(record.pace)})</span>`,
    `<span class="pb-date">${dateText}</span>`
  ].join("");
}

function formatKoreanDate(dateString) {
  const date = parseInputDate(dateString);

  if (!date) return dateString;

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

async function loadClubRanking(user) {
  const requestId = ++rankingLoadId;
  const rankingList = document.getElementById("rankingList");
  const rankingStatus = document.getElementById("rankingStatus");
  const rankingDistance = document.getElementById("rankingDistance");
  const rankingType = document.getElementById("rankingType");
  const rankingTypeColumns = document.querySelectorAll(".ranking-type-col");
  const rankingAdminColumns = document.querySelectorAll(".ranking-admin-col");
  const loadMoreRankingBtn = document.getElementById("loadMoreRanking");

  if (!rankingList || !rankingStatus || !rankingDistance || !rankingType) return;

  rankingList.innerHTML = "";
  loadMoreRankingBtn?.classList.add("hidden");
  rankingTypeColumns.forEach((column) => {
    column.classList.toggle("hidden", rankingType.value === "race");
  });
  rankingAdminColumns.forEach((column) => {
    column.classList.toggle("hidden", !isHostUser(user));
  });

  if (!user) {
    latestClubRankings = [];
    latestClubRankingMeta = null;
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
      if (!getSavedRankingEligibility(data)) return;

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
      latestClubRankings = [];
      latestClubRankingMeta = null;
      rankingStatus.innerText = "아직 조건에 맞는 기록이 없습니다.";
      return;
    }

    latestClubRankings = rankings;
    latestClubRankingMeta = {
      selectedDistance,
      onlyRace
    };
    renderClubRankingList(user);
  } catch (e) {
    console.error(e);
    latestClubRankings = [];
    latestClubRankingMeta = null;
    loadMoreRankingBtn?.classList.add("hidden");
    rankingStatus.innerText = "나빌러닝 PB 랭킹을 불러오지 못했습니다. Firestore 보안 규칙에서 전체 기록 읽기가 허용되어 있는지 확인해주세요.";
  }
}

function renderClubRankingList(user) {
  const rankingList = document.getElementById("rankingList");
  const rankingStatus = document.getElementById("rankingStatus");
  const loadMoreRankingBtn = document.getElementById("loadMoreRanking");

  if (!rankingList || !rankingStatus || !latestClubRankingMeta) return;

  const { selectedDistance, onlyRace } = latestClubRankingMeta;
  const visibleRankings = latestClubRankings.slice(0, visibleClubRankingCount);
  rankingList.innerHTML = "";

  visibleRankings.forEach((entry, index) => {
    const tr = document.createElement("tr");
    const isMe = entry.userId === user?.uid || entry.email === user?.email;

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

  const myRankIndex = latestClubRankings.findIndex((entry) => entry.userId === user?.uid || entry.email === user?.email);
  const distanceLabel = getDistanceLabel(selectedDistance);
  const typeLabel = onlyRace ? "대회 기록" : "전체 기록";
  const visibleCount = Math.min(visibleClubRankingCount, latestClubRankings.length);
  const visibleText = latestClubRankings.length > INITIAL_VISIBLE_RANKING_COUNT
    ? ` · ${visibleCount}/${latestClubRankings.length}명 표시`
    : "";

  if (myRankIndex >= 0) {
    const percentile = Math.round(((myRankIndex + 1) / latestClubRankings.length) * 100);
    rankingStatus.innerText = `${distanceLabel} ${typeLabel} 기준 내 순위: ${myRankIndex + 1}위 / ${latestClubRankings.length}명, 상위 ${percentile}%${visibleText}`;
  } else {
    rankingStatus.innerText = `${distanceLabel} ${typeLabel} 기준 랭킹입니다. 아직 내 기록은 없습니다.${visibleText}`;
  }

  loadMoreRankingBtn?.classList.toggle("hidden", visibleCount >= latestClubRankings.length);
}

async function loadWeeklyRanking(user) {
  const weeklyRankingList = document.getElementById("weeklyRankingList");
  const weeklyRankingStatus = document.getElementById("weeklyRankingStatus");
  const loadMoreWeeklyRankingBtn = document.getElementById("loadMoreWeeklyRanking");
  const monthKey = getCurrentMonthKey();
  const monthlyPeriodText = getMonthChallengeRangeText(monthKey);
  const selectedGroup = getSelectedChallengeGroup();
  const selectedGroupLabel = getChallengeGroupLabel(selectedGroup);

  if (!weeklyRankingList || !weeklyRankingStatus) return;

  weeklyRankingList.innerHTML = "";
  loadMoreWeeklyRankingBtn?.classList.add("hidden");

  if (!user) {
    latestChallengeRankings = [];
    latestChallengeRankingMeta = null;
    weeklyRankingStatus.innerText = `로그인 후 월간 조별 챌린지 랭킹을 확인할 수 있습니다. 집계 기간: ${monthlyPeriodText}`;
    return;
  }

  weeklyRankingStatus.innerText = "월간 조별 챌린지 랭킹을 불러오는 중입니다...";

  try {
    const profileNames = await loadUserProfileNames();
    const querySnapshot = await getDocsFromServer(collection(db, "runs"));
    const [year, month] = monthKey.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
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

      const isCurrentUserRecord = isCurrentUserRunData(data, user, profileNames);
      const userId = isCurrentUserRecord ? user.uid : data.userId || data.email || snapshotDoc.id;
      const entry = rankingsByUser.get(userId) || {
        userId,
        email: isCurrentUserRecord ? user.email || data.email || "" : data.email || "",
        name: isCurrentUserRecord ? getUserName(user) : getRankingName(data, profileNames),
        group: getMemberChallengeGroup(isCurrentUserRecord ? getUserName(user) : getRankingName(data, profileNames)),
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
      .filter((entry) => {
        if (selectedGroup === "all") return true;
        if (selectedGroup === "unassigned") return entry.group === "미배정";
        return entry.group === selectedGroup;
      })
      .sort((a, b) => {
        if (b.totalDistance !== a.totalDistance) return b.totalDistance - a.totalDistance;
        if (b.count !== a.count) return b.count - a.count;
        return a.averagePace - b.averagePace;
      });

    if (!rankings.length) {
      latestChallengeRankings = [];
      latestChallengeRankingMeta = null;
      weeklyRankingStatus.innerText = `${monthlyPeriodText} ${selectedGroupLabel} 월간 챌린지 기록이 아직 없습니다.`;
      return;
    }

    latestChallengeRankings = rankings;
    latestChallengeRankingMeta = {
      monthlyPeriodText,
      selectedGroupLabel
    };
    renderWeeklyRankingList(user);
  } catch (e) {
    console.error(e);
    latestChallengeRankings = [];
    latestChallengeRankingMeta = null;
    loadMoreWeeklyRankingBtn?.classList.add("hidden");
    weeklyRankingStatus.innerText = "월간 조별 챌린지 랭킹을 불러오지 못했습니다. Firestore 보안 규칙에서 전체 기록 읽기가 허용되어 있는지 확인해주세요.";
  }
}

function renderWeeklyRankingList(user) {
  const weeklyRankingList = document.getElementById("weeklyRankingList");
  const weeklyRankingStatus = document.getElementById("weeklyRankingStatus");
  const loadMoreWeeklyRankingBtn = document.getElementById("loadMoreWeeklyRanking");

  if (!weeklyRankingList || !weeklyRankingStatus || !latestChallengeRankingMeta) return;

  const { monthlyPeriodText, selectedGroupLabel } = latestChallengeRankingMeta;
  const visibleRankings = latestChallengeRankings.slice(0, visibleChallengeRankingCount);
  weeklyRankingList.innerHTML = "";

  visibleRankings.forEach((entry, index) => {
    const tr = document.createElement("tr");
    const isMe = isCurrentUserRankingEntry(entry, user);

    if (isMe) {
      tr.classList.add("my-rank");
    }

    [
      `${index + 1}${isMe ? " (나)" : ""}`,
      entry.name,
      entry.group === "미배정" ? "미배정" : `${entry.group}조`,
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

  const myRankIndex = latestChallengeRankings.findIndex((entry) => isCurrentUserRankingEntry(entry, user));
  const visibleCount = Math.min(visibleChallengeRankingCount, latestChallengeRankings.length);
  const visibleText = latestChallengeRankings.length > INITIAL_VISIBLE_RANKING_COUNT
    ? ` · ${visibleCount}/${latestChallengeRankings.length}명 표시`
    : "";

  if (myRankIndex >= 0) {
    const myEntry = latestChallengeRankings[myRankIndex];
    weeklyRankingStatus.innerText = `${monthlyPeriodText} ${selectedGroupLabel} 기준 내 순위: ${myRankIndex + 1}위 / ${latestChallengeRankings.length}명, ${formatMileage(myEntry.totalDistance)} · ${myEntry.count}일 출석${visibleText}`;
  } else {
    weeklyRankingStatus.innerText = `${monthlyPeriodText} ${selectedGroupLabel} 기준 ${latestChallengeRankings.length}명이 챌린지에 참여 중입니다. 이번 달 첫 기록을 남겨보세요.${visibleText}`;
  }

  loadMoreWeeklyRankingBtn?.classList.toggle("hidden", visibleCount >= latestChallengeRankings.length);
}

async function loadMonthlyAthleteCandidates(user) {
  const monthlyAthleteList = document.getElementById("monthlyAthleteList");
  const monthlyAthleteStatus = document.getElementById("monthlyAthleteStatus");
  const athleteHallList = document.getElementById("athleteHallList");
  const athleteHallStatus = document.getElementById("athleteHallStatus");
  const athleteHallSummaryList = document.getElementById("athleteHallSummaryList");
  const athleteHallSummaryStatus = document.getElementById("athleteHallSummaryStatus");

  if (!monthlyAthleteList || !monthlyAthleteStatus) return;

  monthlyAthleteList.innerHTML = "";
  if (athleteHallList) athleteHallList.innerHTML = "";
  if (athleteHallSummaryList) athleteHallSummaryList.innerHTML = "";

  if (!user) {
    monthlyAthleteStatus.innerText = "로그인 후 이달의 선수 예상을 확인할 수 있습니다.";
    if (athleteHallStatus) athleteHallStatus.innerText = "로그인 후 명예의 전당을 확인할 수 있습니다.";
    if (athleteHallSummaryStatus) athleteHallSummaryStatus.innerText = "로그인 후 명예의 전당을 확인할 수 있습니다.";
    return;
  }

  monthlyAthleteStatus.innerText = "이달의 선수 예상을 계산하는 중입니다...";
  if (athleteHallStatus) athleteHallStatus.innerText = "명예의 전당을 계산하는 중입니다...";
  if (athleteHallSummaryStatus) athleteHallSummaryStatus.innerText = "명예의 전당을 계산하는 중입니다...";

  try {
    const profileNames = await loadUserProfileNames();
    const querySnapshot = await getDocsFromServer(collection(db, "runs"));
    const monthKey = getCurrentMonthKey();
    const runsByUser = new Map();

    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      const distance = Number(data.distance);
      const time = Number(data.time);
      const runDate = getSavedRunDate(data);

      if (!Number.isFinite(distance) || !Number.isFinite(time) || !getDateKey(runDate)) return;

      const userId = data.userId || data.email || snapshotDoc.id;
      const entry = runsByUser.get(userId) || {
        userId,
        email: data.email || "",
        name: getRankingName(data, profileNames),
        runs: []
      };

      entry.runs.push({
        id: snapshotDoc.id,
        userId,
        email: data.email || "",
        name: entry.name,
        distance,
        time,
        runDate,
        type: data.type || "training",
        workoutType: data.workoutType || (data.type === "training" && String(data.raceName || "").startsWith("[고강도]") ? "other" : "steady"),
        qualityPlanDate: data.qualityPlanDate || "",
        raceName: data.raceName || "",
        rankingEligible: getSavedRankingEligibility(data)
      });
      runsByUser.set(userId, entry);
    });

    const memberEntries = Array.from(runsByUser.values());
    const candidates = getMonthlyAthleteCandidatesForMonth(memberEntries, monthKey);
    const finalizedMonthKey = getLatestFinalizedMonthKey();

    if (!candidates.length) {
      monthlyAthleteStatus.innerText = `${formatMonthLabel(monthKey)} 이달의 선수 예상 기록이 아직 없습니다.`;
      renderAthleteHallOfFame(memberEntries, user, finalizedMonthKey);
      return;
    }

    candidates.slice(0, 10).forEach((entry, index) => {
      const tr = document.createElement("tr");
      const isMe = entry.userId === user.uid || entry.email === user.email;

      if (isMe) {
        tr.classList.add("my-rank");
      }

      [
        `${index + 1}${isMe ? " (나)" : ""}`,
        entry.name,
        `예상 ${formatAthleteScore(entry.totalScore)}점 / 확정 ${formatAthleteScore(entry.confirmedScore)}점`,
        `${formatAthleteScore(entry.attendanceScore)}/${entry.attendanceMaxScore} (${entry.attendanceDays}일)`,
        `${formatAthleteScore(entry.mileageScore)}/${entry.mileageMaxScore} (${entry.groupLabel} ${entry.mileageRate}%)`,
        `${formatAthleteScore(entry.qualityScore)}/${entry.qualityMaxScore} (${formatQualityCredit(entry.qualityAttendanceDays)}/${entry.qualityWorkoutCount}회 인정)`,
        formatMonthlyGrowthScore(entry),
        `+${formatAthleteScore(entry.raceBonus)}점 (${entry.raceBonusLabel})`,
        `+${entry.badgeBonus}점 (${entry.badgeCount}개)`
      ].forEach((value) => {
        const td = document.createElement("td");
        td.innerText = value;
        tr.appendChild(td);
      });

      monthlyAthleteList.appendChild(tr);
    });

    const leader = candidates[0];
    const leaders = candidates.filter((candidate) => isSameMonthlyAthleteAwardScore(candidate, leader));
    const myRankIndex = candidates.findIndex((entry) => entry.userId === user.uid || entry.email === user.email);
    const myRankText = myRankIndex >= 0 ? ` 내 순위: ${myRankIndex + 1}위 / ${candidates.length}명.` : "";
    const leaderText = leaders.length > 1
      ? `${leaders.map((entry) => entry.name).join(", ")} 공동 1위`
      : `${leader.name} 1위`;

    monthlyAthleteStatus.innerText = `${formatMonthLabel(monthKey)} 이달의 선수 예상 ${leaderText}: 예상 ${formatAthleteScore(leader.totalScore)}점, 현재 확정 ${formatAthleteScore(leader.confirmedScore)}점.${myRankText} 월이 끝난 뒤 명예의 전당에 반영됩니다.`;
    renderAthleteHallOfFame(memberEntries, user, finalizedMonthKey);
  } catch (e) {
    console.error(e);
    monthlyAthleteStatus.innerText = "이달의 선수 예상을 계산하지 못했습니다. Firestore 보안 규칙에서 전체 기록 읽기가 허용되어 있는지 확인해주세요.";
    if (athleteHallStatus) athleteHallStatus.innerText = "명예의 전당을 계산하지 못했습니다.";
    if (athleteHallSummaryStatus) athleteHallSummaryStatus.innerText = "명예의 전당을 계산하지 못했습니다.";
  }
}

function getMonthlyAthleteCandidatesForMonth(memberEntries, monthKey) {
  const previousMonthKey = getPreviousMonthKey(monthKey);

  return memberEntries
    .map((entry) => calculateMonthlyAthleteScore(entry, monthKey, previousMonthKey))
    .filter((entry) => entry.attendanceDays > 0)
    .sort(sortMonthlyAthleteCandidates);
}

function renderAthleteHallOfFame(memberEntries, user, currentMonthKey) {
  const athleteHallList = document.getElementById("athleteHallList");
  const athleteHallStatus = document.getElementById("athleteHallStatus");
  const athleteHallSummaryList = document.getElementById("athleteHallSummaryList");
  const athleteHallSummaryStatus = document.getElementById("athleteHallSummaryStatus");

  if (!athleteHallList || !athleteHallStatus) return;

  const monthKeys = getMonthKeysBetween(MONTHLY_ATHLETE_START_MONTH, currentMonthKey);
  const hallEntries = monthKeys
    .map((monthKey) => {
      const candidates = getMonthlyAthleteCandidatesForMonth(memberEntries, monthKey);
      if (!candidates.length) return null;

      const winner = candidates[0];
      const winners = candidates.filter((candidate) => isSameMonthlyAthleteAwardScore(candidate, winner));
      return { monthKey, winners, candidateCount: candidates.length };
    })
    .filter(Boolean)
    .reverse();

  athleteHallList.innerHTML = "";
  if (athleteHallSummaryList) athleteHallSummaryList.innerHTML = "";

  if (!hallEntries.length) {
    athleteHallStatus.innerText = "아직 확정되어 명예의 전당에 기록할 수상자가 없습니다.";
    if (athleteHallSummaryStatus) athleteHallSummaryStatus.innerText = "아직 첫 명예의 전당 수상자를 기다리고 있습니다.";
    renderAthleteHallSummary([], user);
    return;
  }

  hallEntries.forEach(({ monthKey, winners }) => {
    const tr = document.createElement("tr");
    const primaryWinner = winners[0];
    const isMe = winners.some((winner) => winner.userId === user.uid || winner.email === user.email);

    if (isMe) {
      tr.classList.add("my-rank");
    }

    [
      getAthleteHallMonthLabel(monthKey),
      winners.map((winner) => `${winner.name}${winner.userId === user.uid || winner.email === user.email ? " (나)" : ""}`).join(", "),
      getAthleteHallAchievementSummary(primaryWinner),
      `${formatAthleteScore(primaryWinner.totalScore)}점`,
      `${formatAthleteScore(primaryWinner.attendanceScore)}/${primaryWinner.attendanceMaxScore} (${primaryWinner.attendanceDays}일)`,
      `${formatAthleteScore(primaryWinner.mileageScore)}/${primaryWinner.mileageMaxScore} (${primaryWinner.groupLabel} ${primaryWinner.mileageRate}%)`,
      `${formatAthleteScore(primaryWinner.qualityScore)}/${primaryWinner.qualityMaxScore} (${formatQualityCredit(primaryWinner.qualityAttendanceDays)}/${primaryWinner.qualityWorkoutCount}회 인정)`,
      formatMonthlyGrowthScore(primaryWinner),
      `+${formatAthleteScore(primaryWinner.raceBonus)}점 (${primaryWinner.raceBonusLabel})`,
      `+${primaryWinner.badgeBonus}점 (${primaryWinner.badgeCount}개)`
    ].forEach((value, cellIndex) => {
      const td = document.createElement("td");
      if (cellIndex === 0) {
        td.innerHTML = value;
      } else {
        td.innerText = value;
      }
      tr.appendChild(td);
    });

    athleteHallList.appendChild(tr);
  });

  athleteHallStatus.innerText = `2026년 4월부터 ${hallEntries.length}개월의 확정 이달의 선수를 기록 중입니다.`;
  if (athleteHallSummaryStatus) athleteHallSummaryStatus.innerText = `최근 ${Math.min(3, hallEntries.length)}개월 수상자를 먼저 보여드려요.`;
  renderAthleteHallSummary(hallEntries, user);
}

function renderAthleteHallSummary(hallEntries, user) {
  const athleteHallSummaryList = document.getElementById("athleteHallSummaryList");

  if (!athleteHallSummaryList) return;

  athleteHallSummaryList.innerHTML = "";

  if (!hallEntries.length) {
    const empty = document.createElement("div");
    empty.className = "hall-summary-empty";
    empty.innerText = "첫 수상자가 나오면 이곳에 가장 먼저 올라옵니다.";
    athleteHallSummaryList.appendChild(empty);
    return;
  }

  hallEntries.slice(0, 3).forEach(({ monthKey, winners }) => {
    const primaryWinner = winners[0];
    const isMe = winners.some((winner) => winner.userId === user.uid || winner.email === user.email);
    const card = document.createElement("div");
    const month = document.createElement("div");
    const name = document.createElement("div");
    const score = document.createElement("div");
    const achievement = document.createElement("div");

    card.className = "hall-summary-card";
    if (isMe) {
      card.classList.add("my-rank");
    }

    month.className = "hall-summary-month";
    month.innerHTML = getAthleteHallMonthLabel(monthKey);
    name.className = "hall-summary-name";
    name.innerText = winners.map((winner) => `${winner.name}${winner.userId === user.uid || winner.email === user.email ? " (나)" : ""}`).join(", ");
    achievement.className = "hall-summary-achievement";
    achievement.innerText = getAthleteHallAchievementSummary(primaryWinner);
    score.className = "hall-summary-score";
    score.innerText = `${formatAthleteScore(primaryWinner.totalScore)}점 · 정훈 ${formatQualityCredit(primaryWinner.qualityAttendanceDays)}/${primaryWinner.qualityWorkoutCount}회 인정`;

    card.append(month, name, achievement, score);
    athleteHallSummaryList.appendChild(card);
  });
}

function getAthleteHallMonthLabel(monthKey) {
  return `${formatMonthLabel(monthKey)} <span class="hall-month-star">★ ${Number(monthKey.split("-")[1])}월 왕별</span>`;
}

function getAthleteHallAchievementSummary(entry) {
  const highlights = [
    `출석 ${entry.attendanceDays}일`,
    formatMileage(entry.totalDistance),
    `정훈 ${formatQualityCredit(entry.qualityAttendanceDays)}/${entry.qualityWorkoutCount}회`
  ];

  if (entry.raceBonus) {
    highlights.push(`대회 +${formatAthleteScore(entry.raceBonus)}점`);
  } else if (entry.badgeCount) {
    highlights.push(`배지 ${entry.badgeCount}개`);
  }

  return highlights.join(" · ");
}

function formatQualityCredit(value) {
  if (Number.isInteger(value)) return String(value);

  return value.toFixed(1);
}

function isSameMonthlyAthleteAwardScore(candidate, winner) {
  return candidate.totalScore === winner.totalScore
    && candidate.confirmedScore === winner.confirmedScore
    && candidate.qualityRate === winner.qualityRate
    && candidate.attendanceDays === winner.attendanceDays
    && candidate.mileageRate === winner.mileageRate
    && candidate.growthScore === winner.growthScore
    && candidate.raceBonus === winner.raceBonus;
}

function getMonthKeysBetween(startMonthKey, endMonthKey) {
  const [startYear, startMonth] = startMonthKey.split("-").map(Number);
  const [endYear, endMonth] = endMonthKey.split("-").map(Number);
  const date = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth - 1, 1);
  const monthKeys = [];

  while (date <= endDate) {
    monthKeys.push(dateToInputValue(date).slice(0, 7));
    date.setMonth(date.getMonth() + 1);
  }

  return monthKeys;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
}

function clampScore(score, maxScore = 100, precision = 0) {
  const factor = 10 ** precision;
  const clamped = Math.min(maxScore, Math.max(0, score));

  return Math.round(clamped * factor) / factor;
}

function formatAthleteScore(score) {
  return Number.isInteger(score) ? `${score}` : score.toFixed(1);
}

function getMonthlyAthleteScoreWeights(monthKey) {
  if (monthKey < MONTHLY_GROWTH_SCORE_START_MONTH) {
    return {
      attendance: 30,
      mileage: 30,
      quality: 30,
      growth: 0
    };
  }

  return {
    attendance: 25,
    mileage: 25,
    quality: 25,
    growth: 15
  };
}

function formatMonthlyGrowthScore(entry) {
  if (!entry.growthMaxScore) return "5월부터 적용";

  return `${formatAthleteScore(entry.growthScore)}/${entry.growthMaxScore}`;
}

function getLinearScore(value, maxValue, maxScore) {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) return 0;

  return clampScore((value / maxValue) * maxScore, maxScore, 1);
}

function getMonthProgressInfo(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const currentMonthKey = getCurrentMonthKey();

  if (monthKey !== currentMonthKey) {
    return {
      totalDays,
      elapsedDays: totalDays,
      isCurrentMonth: false
    };
  }

  const today = new Date();

  return {
    totalDays,
    elapsedDays: Math.max(1, Math.min(today.getDate(), totalDays)),
    isCurrentMonth: true
  };
}

function projectMonthlyValue(value, monthKey) {
  const progress = getMonthProgressInfo(monthKey);

  if (!progress.isCurrentMonth) return value;

  return (value / progress.elapsedDays) * progress.totalDays;
}

function calculateMonthlyAthleteScore(entry, monthKey, previousMonthKey) {
  const scoreWeights = getMonthlyAthleteScoreWeights(monthKey);
  const currentRuns = entry.runs.filter((run) => isRunInMonth(run, monthKey));
  const previousRuns = entry.runs.filter((run) => isRunInMonth(run, previousMonthKey));
  const attendanceDays = countUniqueRunDates(currentRuns);
  const totalDistance = currentRuns.reduce((total, run) => total + run.distance, 0);
  const groupTarget = getMonthlyMileageTarget(entry.name);
  const mileageRate = groupTarget ? clampScore((totalDistance / groupTarget) * 100, 999, 1) : 0;
  const qualitySummary = getQualityWorkoutCompletionSummary(entry.runs, monthKey, true);
  const elapsedQualitySummary = getQualityWorkoutCompletionSummary(entry.runs, monthKey);
  const qualityWorkoutCount = qualitySummary.workoutCount;
  const qualityAttendanceDays = qualitySummary.credit;
  const qualityRate = qualityWorkoutCount ? qualityAttendanceDays / qualityWorkoutCount : 0;
  const attendanceScore = getAttendanceScore(attendanceDays, scoreWeights.attendance);
  const mileageScore = getMileageScore(mileageRate, scoreWeights.mileage);
  const qualityScore = getQualityAttendanceScore(qualityRate, scoreWeights.quality);
  const growthScore = scoreWeights.growth ? getGrowthScore(currentRuns, previousRuns, scoreWeights.growth) : 0;
  const raceSummary = getMonthlyRaceBonusSummary(currentRuns);
  const raceCount = raceSummary.raceCount;
  const raceBonus = raceSummary.raceBonus;
  const badgeAchievements = getMonthlyBadgeAchievements(currentRuns, previousRuns, qualitySummary, totalDistance);
  const badgeCount = badgeAchievements.length;
  const badgeBonus = getMonthlyBadgeBonus(badgeCount);
  const projectedAttendanceDays = Math.min(getMonthProgressInfo(monthKey).totalDays, Math.round(projectMonthlyValue(attendanceDays, monthKey)));
  const projectedDistance = projectMonthlyValue(totalDistance, monthKey);
  const projectedMileageRate = groupTarget ? clampScore((projectedDistance / groupTarget) * 100, 999, 1) : 0;
  const projectedQualityWorkoutCount = qualitySummary.workoutCount;
  const projectedQualityRate = elapsedQualitySummary.workoutCount
    ? Math.min(1, elapsedQualitySummary.credit / elapsedQualitySummary.workoutCount)
    : qualityRate;
  const projectedQualityAttendanceDays = projectedQualityWorkoutCount
    ? Math.min(projectedQualityWorkoutCount, projectedQualityRate * projectedQualityWorkoutCount)
    : qualityAttendanceDays;
  const projectedAttendanceScore = getAttendanceScore(projectedAttendanceDays, scoreWeights.attendance, true);
  const projectedMileageScore = getMileageScore(projectedMileageRate, scoreWeights.mileage);
  const projectedQualityScore = getQualityAttendanceScore(projectedQualityWorkoutCount ? projectedQualityAttendanceDays / projectedQualityWorkoutCount : 0, scoreWeights.quality, true);
  const projectedBadgeAchievements = getMonthlyBadgeAchievementsFromMetrics({
    attendanceDays: projectedAttendanceDays,
    totalDistance: projectedDistance,
    qualityCredit: projectedQualityAttendanceDays,
    raceCount,
    hasPersonalBest: hasMonthlyPersonalBest(currentRuns, previousRuns)
  });
  const projectedBadgeCount = projectedBadgeAchievements.length;
  const projectedBadgeBonus = getMonthlyBadgeBonus(projectedBadgeCount);
  const confirmedScore = clampScore(attendanceScore + mileageScore + qualityScore + growthScore + raceBonus + badgeBonus, 100, 1);
  const totalScore = clampScore(projectedAttendanceScore + projectedMileageScore + projectedQualityScore + growthScore + raceBonus + projectedBadgeBonus, 100, 1);

  return {
    ...entry,
    totalScore,
    confirmedScore,
    attendanceDays,
    attendanceScore,
    attendanceMaxScore: scoreWeights.attendance,
    projectedAttendanceDays,
    projectedAttendanceScore,
    totalDistance,
    projectedDistance,
    groupLabel: getMonthlyMileageGroupLabel(entry.name, groupTarget),
    mileageRate,
    mileageScore,
    mileageMaxScore: scoreWeights.mileage + MONTHLY_MILEAGE_OVER_TARGET_BONUS_MAX,
    projectedMileageRate,
    projectedMileageScore,
    qualityWorkoutCount,
    qualityAttendanceDays,
    projectedQualityAttendanceDays,
    qualityOnDayCount: qualitySummary.onDayCount,
    qualityMakeupCount: qualitySummary.makeupCount,
    qualityRate,
    qualityScore,
    qualityMaxScore: scoreWeights.quality,
    projectedQualityRate,
    projectedQualityScore,
    growthScore,
    growthMaxScore: scoreWeights.growth,
    raceCount,
    raceBonus,
    raceBonusRaw: raceSummary.rawBonus,
    raceBonusLabel: raceSummary.label,
    badgeCount,
    badgeBonus,
    badgeAchievements,
    projectedBadgeCount,
    projectedBadgeBonus,
    projectedBadgeAchievements
  };
}

function isRaceResultForMonthlyAthlete(run) {
  return run.type === "race" && Boolean(String(run.raceName || "").trim());
}

function getRaceBonusCourse(run) {
  const distance = Number(run.distance);

  if (!Number.isFinite(distance)) return "기타";
  if (distance >= 41 && distance <= 43) return "Full";
  if (distance >= 20 && distance <= 22.5) return "Half";
  if (distance >= 9 && distance <= 11) return "10K";
  if (distance >= 4.5 && distance <= 5.5) return "5K";

  return "기타";
}

function getRaceCourseBonus(course) {
  if (course === "Full") return 5;
  if (course === "Half") return 3;
  if (course === "10K") return 2;
  return 1;
}

function getMonthlyRaceBonusSummary(runs) {
  const raceRuns = runs.filter(isRaceResultForMonthlyAthlete);
  const courseCounts = new Map();
  let rawBonus = 0;

  raceRuns.forEach((run) => {
    const course = getRaceBonusCourse(run);
    rawBonus += getRaceCourseBonus(course);
    courseCounts.set(course, (courseCounts.get(course) || 0) + 1);
  });

  const label = Array.from(courseCounts.entries())
    .map(([course, count]) => `${course} ${count}회`)
    .join(", ");

  return {
    raceCount: raceRuns.length,
    rawBonus,
    raceBonus: Math.min(rawBonus, 5),
    label: label || "0회"
  };
}

function sortMonthlyAthleteCandidates(a, b) {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  if (b.confirmedScore !== a.confirmedScore) return b.confirmedScore - a.confirmedScore;
  if (b.qualityRate !== a.qualityRate) return b.qualityRate - a.qualityRate;
  if (b.attendanceDays !== a.attendanceDays) return b.attendanceDays - a.attendanceDays;
  if (b.mileageRate !== a.mileageRate) return b.mileageRate - a.mileageRate;
  if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
  if (b.raceBonus !== a.raceBonus) return b.raceBonus - a.raceBonus;
  if (b.badgeBonus !== a.badgeBonus) return b.badgeBonus - a.badgeBonus;
  if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount;
  return a.name.localeCompare(b.name, "ko");
}

function countUniqueRunDates(runs) {
  return new Set(runs.map((run) => getDateKey(run.runDate)).filter(Boolean)).size;
}

function getAttendanceScore(attendanceDays, maxScore = 25, useLinear = false) {
  return getLinearScore(attendanceDays, 16, maxScore);
}

function getMileageScore(mileageRate, maxScore = 25, useLinear = false) {
  const baseScore = getLinearScore(Math.min(mileageRate, 100), 100, maxScore);
  const overTargetBonus = mileageRate > 100
    ? Math.min(MONTHLY_MILEAGE_OVER_TARGET_BONUS_MAX, Math.floor((mileageRate - 100) / 10) * 0.5)
    : 0;

  return clampScore(baseScore + overTargetBonus, maxScore + MONTHLY_MILEAGE_OVER_TARGET_BONUS_MAX, 1);
}

function getQualityAttendanceScore(qualityRate, maxScore = 25, useLinear = false) {
  if (useLinear) return getLinearScore(qualityRate, 1, maxScore);
  if (qualityRate >= 0.9) return maxScore;
  if (qualityRate >= 0.7) return clampScore(maxScore * 0.8, maxScore, 1);
  if (qualityRate >= 0.5) return clampScore(maxScore * 0.56, maxScore, 1);
  if (qualityRate >= 0.25) return clampScore(maxScore * 0.28, maxScore, 1);
  return 0;
}

function getMonthlyMileageTarget(memberName) {
  const group = getRunningGroupByMemberName(memberName);
  const targetMatch = String(group?.monthlyMileage || "").match(/\d+/);

  return Number(targetMatch?.[0]) || 120;
}

function getMonthlyMileageGroupLabel(memberName, targetKm) {
  const group = getRunningGroupByMemberName(memberName);

  return group ? `${group.group}조 기준 ${targetKm}km` : `기본 기준 ${targetKm}km`;
}

function getCountedQualityWorkoutsForMonth(monthKey, includeFuture = false) {
  const [year, month] = monthKey.split("-").map(Number);
  const scheduledWorkouts = QUALITY_MONTHLY_SCHEDULE[month]?.workouts || [];
  const currentMonthKey = getCurrentMonthKey();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return scheduledWorkouts
    .map((workout) => ({
      ...workout,
      officialDate: parseQualityWorkoutDate(workout.date, year)
    }))
    .filter((workout) => {
      if (!workout.officialDate || workout.officialDate.getMonth() !== month - 1) return false;
      if (includeFuture) return true;

      return monthKey === currentMonthKey ? workout.officialDate <= today : true;
    });
}

function getQualityWorkoutCompletionSummary(runs, monthKey, includeFuture = false) {
  const countedWorkouts = getCountedQualityWorkoutsForMonth(monthKey, includeFuture);

  if (!countedWorkouts.length) {
    const workoutCount = getMonthlyQualityWorkoutCount(monthKey, includeFuture);
    const credit = Math.min(countUniqueRunDates(runs.filter((run) => isRunInMonth(run, monthKey) && isQualityWorkout(run))), workoutCount);

    return {
      workoutCount,
      credit,
      onDayCount: credit,
      makeupCount: 0
    };
  }

  const workoutsByPlanDate = new Map(countedWorkouts.map((workout) => [workout.date, workout]));
  const workoutsByOfficialDate = new Map(countedWorkouts.map((workout) => [getDateKey(workout.officialDate), workout]));
  const creditByPlanDate = new Map();
  const typeByPlanDate = new Map();

  runs
    .filter((run) => isRunInMonth(run, monthKey) && isQualityWorkout(run))
    .forEach((run) => {
      const runDateKey = getDateKey(run.runDate);
      const workout = workoutsByPlanDate.get(run.qualityPlanDate || "") || workoutsByOfficialDate.get(runDateKey);

      if (!workout) return;

      const officialDateKey = getDateKey(workout.officialDate);
      const credit = runDateKey === officialDateKey ? 1 : QUALITY_MAKEUP_CREDIT;
      const previousCredit = creditByPlanDate.get(workout.date) || 0;

      if (credit > previousCredit) {
        creditByPlanDate.set(workout.date, credit);
        typeByPlanDate.set(workout.date, credit === 1 ? "on-day" : "makeup");
      }
    });

  const credit = Array.from(creditByPlanDate.values()).reduce((total, value) => total + value, 0);
  const types = Array.from(typeByPlanDate.values());

  return {
    workoutCount: countedWorkouts.length,
    credit,
    onDayCount: types.filter((type) => type === "on-day").length,
    makeupCount: types.filter((type) => type === "makeup").length
  };
}

function getMonthlyQualityWorkoutCount(monthKey, includeFuture = false) {
  const [, month] = monthKey.split("-").map(Number);
  const scheduledWorkouts = QUALITY_MONTHLY_SCHEDULE[month]?.workouts || [];
  const countedWorkouts = getCountedQualityWorkoutsForMonth(monthKey, includeFuture);

  if (scheduledWorkouts.length) {
    return countedWorkouts.length;
  }

  const currentMonthKey = getCurrentMonthKey();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return countWeekdaysInMonth(monthKey, 2, !includeFuture && monthKey === currentMonthKey ? today : null);
}

function countWeekdaysInMonth(monthKey, weekday, maxDate = null) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  let count = 0;

  while (date.getMonth() === month - 1) {
    if (maxDate && date > maxDate) break;
    if (date.getDay() === weekday) count += 1;
    date.setDate(date.getDate() + 1);
  }

  return count;
}

function getGrowthScore(currentRuns, previousRuns, maxScore = 15) {
  const unit = maxScore / 4;

  if (!previousRuns.length) return currentRuns.length ? 10 : 0;

  const currentStats = calculateRunStats(currentRuns);
  const previousStats = calculateRunStats(previousRuns);
  const currentAttendance = countUniqueRunDates(currentRuns);
  const previousAttendance = countUniqueRunDates(previousRuns);
  let score = 0;

  if (currentAttendance > previousAttendance) score += unit;
  if (currentStats.totalDistance > previousStats.totalDistance) score += unit;
  if (hasMonthlyPersonalBest(currentRuns, previousRuns)) score += unit;

  const keptTrainingVolume = currentStats.totalDistance >= previousStats.totalDistance * 0.8
    || currentAttendance >= previousAttendance * 0.8;

  if (keptTrainingVolume && currentStats.averagePace && previousStats.averagePace && currentStats.averagePace < previousStats.averagePace) {
    score += unit;
  }

  return clampScore(score, maxScore, 1);
}

function getMonthlyBadgeAchievements(currentRuns, previousRuns, qualitySummary, totalDistance) {
  const attendanceDays = countUniqueRunDates(currentRuns);
  const raceCount = currentRuns.filter(isRaceResultForMonthlyAthlete).length;
  const hasPersonalBest = hasMonthlyPersonalBest(currentRuns, previousRuns);

  return getMonthlyBadgeAchievementsFromMetrics({
    attendanceDays,
    totalDistance,
    qualityCredit: qualitySummary.credit,
    raceCount,
    hasPersonalBest
  });
}

function getMonthlyBadgeAchievementsFromMetrics({ attendanceDays, totalDistance, qualityCredit, raceCount, hasPersonalBest }) {
  const badges = [];

  if (attendanceDays >= 1) badges.push("첫 러닝");
  if (attendanceDays >= 8) badges.push("월 8일 출석");
  if (attendanceDays >= 12) badges.push("월 12일 출석");
  if (attendanceDays >= 16) badges.push("월 16일 출석");
  if (totalDistance >= 50) badges.push("월 50km");
  if (totalDistance >= 100) badges.push("월 100km");
  if (totalDistance >= 150) badges.push("월 150km");
  if (qualityCredit >= 1) badges.push("정훈 참여");
  if (qualityCredit >= 2) badges.push("정훈 2회 인정");
  if (hasPersonalBest) badges.push("PB 갱신");
  if (raceCount > 0) badges.push("대회 도전");

  return badges;
}

function getMonthlyBadgeBonus(badgeCount) {
  if (badgeCount >= 5) return 5;
  if (badgeCount >= 3) return 3;
  if (badgeCount >= 1) return 1;
  return 0;
}

function hasMonthlyPersonalBest(currentRuns, previousRuns) {
  return PB_CATEGORIES.some((category) => {
    const currentBest = getBestCategoryTime(currentRuns, category.distance);
    const previousBest = getBestCategoryTime(previousRuns, category.distance);

    return Number.isFinite(currentBest) && Number.isFinite(previousBest) && currentBest < previousBest;
  });
}

function getBestCategoryTime(runs, distance) {
  const categoryRuns = runs.filter((run) => run.rankingEligible !== false && isSameDistanceCategory(run.distance, distance));

  if (!categoryRuns.length) return Infinity;

  return categoryRuns.reduce((best, run) => Math.min(best, run.time), Infinity);
}

function getSavedRankingEligibility(data) {
  if (isRankingEligibleQualityTimeTrial(data.qualityPlannedWorkout || "")) return true;

  return data.rankingEligible !== false;
}

function isSameDistanceCategory(distance, selectedDistance) {
  const tolerance = getDistanceCategoryTolerance(selectedDistance);
  return Math.abs(distance - selectedDistance) <= tolerance;
}

function getDistanceCategoryTolerance(selectedDistance) {
  return selectedDistance >= 42 ? 2 : selectedDistance >= 21 ? 1 : 0.5;
}

function getRoundedCourseLowerTolerance(targetDistance) {
  if (targetDistance >= 42) return 0.3;
  if (targetDistance >= 21) return 0.15;
  return 0.1;
}

function getCourseRecordForDistance(distance, time, targetDistance) {
  const tolerance = getDistanceCategoryTolerance(targetDistance);
  const lowerTolerance = getRoundedCourseLowerTolerance(targetDistance);

  if (!Number.isFinite(distance) || !Number.isFinite(time) || !Number.isFinite(targetDistance)) {
    return null;
  }

  if (distance <= 0 || time <= 0 || targetDistance <= 0) {
    return null;
  }

  if (distance < targetDistance - lowerTolerance) {
    return null;
  }

  if (distance - targetDistance > tolerance) {
    return null;
  }

  const isRoundedStandardCourse = distance < targetDistance && targetDistance - distance <= lowerTolerance;
  const courseTime = isRoundedStandardCourse ? time : time * (targetDistance / distance);

  return {
    distance: targetDistance,
    time: courseTime,
    pace: courseTime / targetDistance,
    originalDistance: distance,
    originalTime: time,
    isAdjusted: !isRoundedStandardCourse && Math.abs(distance - targetDistance) > 0.001
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
  latestHealingEvents = [];
  latestHealingResponses = [];
  latestHealingCheckins = [];
  latestHealingCheers = [];
  monthlyGoalKm = 0;
  monthlyGoalLocked = false;
  visibleRunCount = INITIAL_VISIBLE_RUN_COUNT;
  visibleClubRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
  visibleChallengeRankingCount = INITIAL_VISIBLE_RANKING_COUNT;
  latestClubRankings = [];
  latestClubRankingMeta = null;
  latestChallengeRankings = [];
  latestChallengeRankingMeta = null;
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
  document.getElementById("dailyRecommendation").innerText = "오늘 몸에 맞는 러닝과 회복을 살짝 골라드릴게요.";
  document.getElementById("monthlyGoal").value = "";
  document.getElementById("monthlyGoal").disabled = false;
  document.getElementById("saveMonthlyGoal").disabled = false;
  document.getElementById("saveMonthlyGoal").innerText = "목표 저장";
  document.getElementById("monthlyGoalStatus").innerText = "목표 입력 전";
  document.getElementById("monthlyGoalStatus").classList.remove("goal-star");
  document.getElementById("rankingList").innerHTML = "";
  document.getElementById("rankingStatus").innerText = "";
  document.getElementById("loadMoreRanking").classList.add("hidden");
  document.getElementById("weeklyRankingList").innerHTML = "";
  document.getElementById("weeklyRankingStatus").innerText = `로그인 후 월간 조별 챌린지 랭킹을 확인할 수 있습니다. 집계 기간: ${getMonthChallengeRangeText()}`;
  document.getElementById("loadMoreWeeklyRanking").classList.add("hidden");
  document.getElementById("monthlyAthleteList").innerHTML = "";
  document.getElementById("monthlyAthleteStatus").innerText = "로그인 후 이달의 선수 예상을 확인할 수 있습니다.";
  document.getElementById("athleteHallSummaryList").innerHTML = "";
  document.getElementById("athleteHallSummaryStatus").innerText = "로그인 후 명예의 전당을 확인할 수 있습니다.";
  document.getElementById("athleteHallList").innerHTML = "";
  document.getElementById("athleteHallStatus").innerText = "로그인 후 명예의 전당을 확인할 수 있습니다.";
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
  document.getElementById("healingEventList").innerHTML = "";
  document.getElementById("healingCheckinList").innerHTML = "";
  document.getElementById("healingCheerList").innerHTML = "";
  document.getElementById("healingEventStatus").innerText = "로그인 후 힐링 탭을 사용할 수 있습니다.";
  document.getElementById("healingCheckinStatus").innerText = "로그인 후 한 줄 체크인을 확인할 수 있습니다.";
  document.getElementById("healingCheerStatus").innerText = "로그인 후 응원 한마디를 확인할 수 있습니다.";
  resetHealingEventForm();
  resetHealingCheckinForm();
  resetHealingCheerForm();
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

function getRollingAverageData(values, windowSize = 5) {
  return values.map((value, index) => {
    if (!Number.isFinite(value)) return null;

    const start = Math.max(0, index - windowSize + 1);
    const slice = values.slice(start, index + 1).filter(Number.isFinite);

    if (!slice.length) return null;

    return Number((slice.reduce((total, item) => total + item, 0) / slice.length).toFixed(2));
  });
}

function getPaceTrendText(dailyChartData) {
  if (dailyChartData.length < 3) {
    return "기록이 조금 더 쌓이면 페이스 흐름을 더 정확히 읽을 수 있습니다.";
  }

  const recent = dailyChartData.slice(-3);
  const previous = dailyChartData.slice(Math.max(0, dailyChartData.length - 6), -3);

  if (!previous.length) {
    return "최근 기록을 기준으로 페이스 기준선을 만들어가는 중입니다.";
  }

  const recentPace = recent.reduce((total, day) => total + day.pace, 0) / recent.length;
  const previousPace = previous.reduce((total, day) => total + day.pace, 0) / previous.length;
  const diffSeconds = Math.round((recentPace - previousPace) * 60);

  if (diffSeconds <= -10) {
    return `최근 3회 평균이 이전 흐름보다 ${Math.abs(diffSeconds)}초/km 빨라졌습니다. 좋은 상승 흐름입니다.`;
  }

  if (diffSeconds >= 15) {
    return `최근 3회 평균이 이전 흐름보다 ${diffSeconds}초/km 느려졌습니다. 거리 증가나 피로 누적 여부를 확인해 주세요.`;
  }

  return "최근 페이스는 큰 흔들림 없이 유지되고 있습니다. 거리와 회복 리듬을 함께 관리해 주세요.";
}

function getChartCoachNote(dailyChartData, averagePace, totalDistance) {
  if (!dailyChartData.length) {
    return "";
  }

  const trendText = getPaceTrendText(dailyChartData);
  const recentDistance = dailyChartData.slice(-7).reduce((total, day) => total + day.distance, 0);
  const lastDay = dailyChartData[dailyChartData.length - 1];
  const notes = [trendText];

  if (monthlyGoalKm) {
    const monthMileage = sumMileageByMonth(latestRuns, getCurrentMonthKey());
    const progress = Math.round((monthMileage / monthlyGoalKm) * 100);

    if (progress >= 100) {
      notes.push("월간 목표는 이미 달성했습니다. 남은 기간은 무리보다 유지와 회복이 더 중요합니다.");
    } else if (progress < 50 && new Date().getDate() >= 16) {
      notes.push("월 중반 이후 목표 대비 누적 거리가 낮습니다. 짧은 조깅을 자주 넣는 전략이 좋습니다.");
    }
  }

  if (dailyChartData.length >= 2 && lastDay.distance >= 20 && lastDay.pace > averagePace + 0.25) {
    notes.push("최근 장거리 후 페이스가 느려진 흐름이 보여 회복주를 한 번 넣으면 좋겠습니다.");
  } else if (recentDistance >= 60) {
    notes.push("최근 누적 거리가 높은 편입니다. 컨디션이 무겁다면 강도보다 회복을 우선해 주세요.");
  } else if (totalDistance < 20 && dailyChartData.length >= 2) {
    notes.push("기록 빈도를 조금만 더 늘리면 추세선의 신뢰도가 좋아집니다.");
  }

  return notes.join(" ");
}

function renderChartSummary(dailyChartData, averagePace, targetPace) {
  const summary = document.getElementById("chartSummary");
  const coachNote = document.getElementById("chartCoachNote");

  if (!summary) return;

  if (!dailyChartData.length) {
    summary.innerHTML = "";
    coachNote?.classList.add("hidden");
    if (coachNote) coachNote.innerText = "";
    return;
  }

  const totalDistance = dailyChartData.reduce((total, day) => total + day.run.distance, 0);
  const recent = dailyChartData.slice(-5);
  const recentDistance = recent.reduce((total, day) => total + day.run.distance, 0);
  const recentTime = recent.reduce((total, day) => total + day.run.time, 0);
  const recentPace = recentDistance > 0 ? recentTime / recentDistance : 0;
  const monthMileage = sumMileageByMonth(latestRuns, getCurrentMonthKey());
  const goalText = monthlyGoalKm
    ? `${Math.min(Math.round((monthMileage / monthlyGoalKm) * 100), 999)}%`
    : "목표 없음";
  const goalHint = monthlyGoalKm
    ? `${formatMileage(monthMileage)} / ${formatMileage(monthlyGoalKm)}`
    : "월간 목표를 입력하면 진행률 표시";
  const targetText = targetPace ? formatPace(targetPace) : "목표 없음";
  const targetHint = targetPace ? "마라톤 목표 페이스" : "목표 설정에서 선택 가능";

  const cards = [
    { label: "선택 기록", value: formatMileage(totalDistance), hint: `${dailyChartData.length}일 운동` },
    { label: "평균 페이스", value: formatPace(averagePace), hint: "선택 기간 전체" },
    { label: "최근 5회", value: recentPace ? formatPace(recentPace) : "-", hint: `최근 ${formatMileage(recentDistance)}` },
    { label: "목표 페이스", value: targetText, hint: targetHint },
    { label: "월 목표", value: goalText, hint: goalHint }
  ];

  summary.innerHTML = cards.map((card) => `
    <div class="chart-summary-card">
      <div class="chart-summary-label">${card.label}</div>
      <div class="chart-summary-value">${card.value}</div>
      <div class="chart-summary-hint">${card.hint}</div>
    </div>
  `).join("");

  if (coachNote) {
    coachNote.innerText = getChartCoachNote(dailyChartData, averagePace, totalDistance);
    coachNote.classList.remove("hidden");
  }
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
  const rollingPaceData = getRollingAverageData(paceData, 5);
  const selectedTargetTime = Number(document.getElementById("targetTime")?.value) || 0;
  const targetPace = selectedTargetTime ? getMarathonPace(selectedTargetTime) : 0;
  const targetPaceData = targetPace ? dailyChartData.map(() => Number(targetPace.toFixed(2))) : [];
  const ctx = document.getElementById("runChart");
  const chartEmpty = document.getElementById("chartEmpty");
  const isMobileChart = window.matchMedia("(max-width: 520px)").matches;

  if (chartEmpty) {
    chartEmpty.classList.toggle("hidden", dailyChartData.length > 0);
  }
  renderChartSummary(dailyChartData, averagePace, targetPace);
  if (!ctx || !window.Chart) return;
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
        },
        {
          type: "line",
          label: "최근 5회 평균",
          data: rollingPaceData,
          yAxisID: "pace",
          borderColor: "rgba(42, 138, 78, 0.95)",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.2
        },
        {
          type: "line",
          label: "목표 페이스",
          data: targetPaceData,
          yAxisID: "pace",
          borderColor: "rgba(127, 86, 217, 0.9)",
          borderDash: [3, 5],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          hidden: !targetPace
        }
      ].filter((dataset) => dataset.label !== "목표 페이스" || targetPace)
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

              if (context.dataset.label === "최근 5회 평균") {
                return `최근 5회 평균: ${formatPace(context.parsed.y)}`;
              }

              if (context.dataset.label === "목표 페이스") {
                return `목표 페이스: ${formatPace(targetPace)}`;
              }

              return `페이스: ${formatPace(run.time / run.distance)}`;
            }
          }
        }
      }
    }
  });
}
