/* Icônes Font Awesome — correspondance avec les pictogrammes du prototype */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as S from "@fortawesome/free-solid-svg-icons";
import * as R from "@fortawesome/free-regular-svg-icons";
import { faBluetoothB } from "@fortawesome/free-brands-svg-icons";

export const ICONS = {
  home: S.faHouse, doc: R.faFileLines, search: S.faMagnifyingGlass, user: R.faUser, bell: R.faBell, pin: S.faLocationDot,
  shield: S.faShieldHalved, shieldck: S.faShieldHeart, lock: S.faLock, users: S.faUsers, clock: R.faClock, plus: S.faPlus,
  arrowR: S.faArrowRight, chevR: S.faChevronRight, chevL: S.faChevronLeft, alert: S.faTriangleExclamation, check: S.faCheck,
  x: S.faXmark, phone: S.faPhone, msg: R.faMessage, camera: S.faCamera, idcard: R.faIdCard, passport: S.faPassport, car: S.faCar,
  brief: S.faBriefcase, heart: R.faHeart, bt: faBluetoothB, mic: S.faMicrophone, eye: R.faEye, eyeOff: R.faEyeSlash, send: S.faPaperPlane, mail: R.faEnvelope, desktop: S.faDesktop,
  clip: S.faPaperclip, key: S.faKey, crown: S.faCrown, gear: S.faGear, logout: S.faRightFromBracket, refresh: S.faRotate,
  truck: S.faTruck, qr: S.faQrcode, siren: S.faTowerBroadcast, receipt: S.faReceipt, info: S.faCircleInfo, grad: S.faGraduationCap,
  umbrella: S.faUmbrella, cross: S.faKitMedical, tap: R.faHandPointer, mega: S.faBullhorn, trash: R.faTrashCan, map: R.faMap,
  hand: S.faHandHoldingHeart, wifioff: S.faWifi, battery: S.faBatteryHalf, upload: S.faUpload, star: R.faStar, fingerprint: S.faFingerprint,
  chart: S.faChartLine, building: S.faBuilding, money: S.faMoneyBillWave, headset: S.faHeadset, box: S.faBoxArchive, userShield: S.faUserShield,
  handshake: S.faHandshake, list: S.faListCheck, sliders: S.faSliders, file: R.faFile, download: S.faDownload, bars: S.faBars, filter: S.faFilter,
  edit: R.faPenToSquare, chartBar: S.faChartColumn, chartUp: S.faChartLine, moto: S.faMotorcycle, server: S.faServer, userTie: S.faUserTie, sitemap: S.faSitemap, gauge: S.faGaugeHigh, invoice: S.faFileInvoiceDollar, magnify: S.faMagnifyingGlass, fileDoc: S.faFileLines, ban: S.faBan, play: S.faPlay, stop: S.faStop, warehouse: S.faWarehouse, magic: S.faWandMagicSparkles, apple: S.faMobileScreen
};

export default function Icon({ n, s = 20, style, className, spin }) {
  return <FontAwesomeIcon icon={ICONS[n] || ICONS.info} style={{ width: s, height: s, fontSize: s, ...style }} className={className} spin={spin} aria-hidden="true" />;
}
