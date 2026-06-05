import type {
  AlertHandleStatus,
  BillingStatus,
  CareLevel,
  PaymentStatus,
  UsageStatus,
  VendorType,
} from "@prisma/client";

export const USAGE_STATUS_LABELS: Record<UsageStatus, string> = {
  active: "入居中",
  discharged: "退去済み",
  scheduled: "入居予定",
  paused: "一時停止",
};

export const CARE_LEVEL_LABELS: Record<CareLevel, string> = {
  support1: "要支援1",
  support2: "要支援2",
  care1: "要介護1",
  care2: "要介護2",
  care3: "要介護3",
  care4: "要介護4",
  care5: "要介護5",
  not_certified: "認定なし",
};

export const ROLE_LABELS = {
  admin: "管理者",
  staff: "一般職員",
  viewer: "閲覧専用",
} as const;

export const INSURANCE_KIND_LABELS = {
  care: "介護保険",
  medical: "医療保険",
  disability: "障害福祉",
  burden_ratio: "負担割合証",
  public_expense: "公費",
  comprehensive: "利用者総合保険",
} as const;

export const ALERT_BUCKET_LABELS = {
  expired: "期限切れ",
  within_30: "30日以内",
  within_60: "60日以内",
  within_90: "90日以内",
} as const;

export const ALERT_STATUS_LABELS: Record<AlertHandleStatus, string> = {
  not_handled: "未対応",
  confirmed: "確認済み",
  contacted: "連絡済み",
  renewed: "更新済み",
};

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  unbilled: "未請求",
  billed: "請求済み",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "未入金",
  paid: "入金済み",
};

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  care_billing: "介護請求ソフト",
  medical: "医療機関",
  insurer: "保険会社",
  meal: "給食業者",
  home_nursing: "訪問看護",
  other: "その他",
};
