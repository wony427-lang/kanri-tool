import type { ReactElement, ReactNode } from "react";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { CareInsuranceDetail } from "@/domains/insurance/types";
import type { EmergencyContactDetail } from "@/domains/residents/types";

import {
  displayValue,
  formatCurrencyYen,
  formatPdfCareLevel,
  formatWarekiDate,
  formatWarekiPeriod,
  splitAddress,
} from "./format";
import type { ResidentPdfData } from "./types";

const BORDER = "#222";
const LABEL_BG = "#f3f3f3";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 8,
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 16,
    lineHeight: 1.35,
    color: "#111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  headerDate: {
    fontSize: 9,
  },
  table: {
    borderWidth: 0.8,
    borderColor: BORDER,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
  },
  rowLast: {
    flexDirection: "row",
  },
  cell: {
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: "center",
    minHeight: 18,
  },
  cellLast: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: "center",
    minHeight: 18,
  },
  label: {
    backgroundColor: LABEL_BG,
    fontSize: 7.5,
    textAlign: "center",
  },
  value: {
    fontSize: 8,
  },
  valueCenter: {
    fontSize: 8,
    textAlign: "center",
  },
  bottomSection: {
    flexDirection: "row",
    minHeight: 110,
  },
  verticalLabel: {
    width: 16,
    backgroundColor: LABEL_BG,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  verticalChar: {
    fontSize: 8,
    lineHeight: 1.1,
  },
  bottomContent: {
    flex: 1,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    padding: 4,
  },
  bottomContentLast: {
    flex: 1,
    padding: 4,
  },
  footer: {
    marginTop: 6,
    fontSize: 6.5,
    color: "#555",
    textAlign: "right",
  },
  checkbox: {
    fontSize: 8,
  },
});

function Cell({
  width,
  label,
  children,
  last = false,
  center = false,
}: {
  width: string | number;
  label?: boolean;
  children?: ReactNode;
  last?: boolean;
  center?: boolean;
}) {
  const style = last ? styles.cellLast : styles.cell;
  return (
    <View style={[style, { width }, ...(label ? [styles.label] : [])]}>
      {typeof children === "string" ? (
        <Text style={center ? styles.valueCenter : styles.value}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function Row({
  children,
  last = false,
}: {
  children: ReactNode;
  last?: boolean;
}) {
  return <View style={last ? styles.rowLast : styles.row}>{children}</View>;
}

function VerticalLabel({ text }: { text: string }) {
  return (
    <View style={styles.verticalLabel}>
      {text.split("").map((char, index) => (
        <Text key={`${char}-${index}`} style={styles.verticalChar}>
          {char}
        </Text>
      ))}
    </View>
  );
}

function CheckboxPair({
  checked,
  yesLabel = "有",
  noLabel = "無",
}: {
  checked: boolean;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <Text style={styles.checkbox}>
      {yesLabel} {checked ? "■" : "□"}  {noLabel} {!checked ? "■" : "□"}
    </Text>
  );
}

function contactByOrder(
  contacts: EmergencyContactDetail[],
  order: number,
): EmergencyContactDetail | undefined {
  return contacts.find((contact) => contact.sortOrder === order);
}

function burdenRatioPeriod(care: CareInsuranceDetail | null): string {
  if (!care?.burdenRatioExpiresAt) {
    return "";
  }
  return formatWarekiPeriod(null, care.burdenRatioExpiresAt);
}

export function ResidentProfileDocument({
  data,
}: {
  data: ResidentPdfData;
}): ReactElement {
  const { resident, exportedAt, exportedBy } = data;
  const care = data.careInsurance;
  const medical = data.medicalInsurance;
  const disability = data.disability;
  const publicExpenseRows = [
    data.publicExpenses[0] ?? null,
    data.publicExpenses[1] ?? null,
  ];
  const medicalCare = resident.medicalCare;
  const { postal, body: addressBody } = splitAddress(resident.address);
  const contact1 = contactByOrder(resident.emergencyContacts, 1);
  const contact2 = contactByOrder(resident.emergencyContacts, 2);
  const hasBurdenRatio =
    care?.burdenRatio !== null && care?.burdenRatio !== undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>利用者基本情報</Text>
          <Text style={styles.headerDate}>
            {formatWarekiDate(exportedAt, { useLocalTime: true })} 現在
          </Text>
        </View>

        <View style={styles.table}>
          <Row>
            <Cell width="12%" label>
              利用者名
            </Cell>
            <Cell width="28%">
              {displayValue(resident.nameKana)}
            </Cell>
            <Cell width="12%" label>
              生年月日
            </Cell>
            <Cell width="28%">
              {formatWarekiDate(resident.birthDate)}
            </Cell>
            <Cell width="20%" last center>
              {displayValue(resident.name)}　{resident.age} 歳
            </Cell>
          </Row>

          <Row>
            <Cell width="12%" label>
              住所
            </Cell>
            <Cell width="88%" last>
              {[postal, addressBody].filter(Boolean).join("\n") || " "}
            </Cell>
          </Row>

          <Row>
            <Cell width="8%" label>
              TEL
            </Cell>
            <Cell width="24%">{displayValue(resident.phone)}</Cell>
            <Cell width="8%" label>
              FAX
            </Cell>
            <Cell width="24%">{""}</Cell>
            <Cell width="8%" label>
              携帯
            </Cell>
            <Cell width="28%" last>
              {displayValue(resident.mobile)}
            </Cell>
          </Row>

          <Row>
            <Cell width="14%" label>
              保険者番号
            </Cell>
            <Cell width="18%">{displayValue(care?.insurerNo)}</Cell>
            <Cell width="14%" label>
              被保険者番号
            </Cell>
            <Cell width="24%">{displayValue(care?.insuredNo)}</Cell>
            <Cell width="12%" label>
              要介護度
            </Cell>
            <Cell width="18%" last>
              {formatPdfCareLevel(care?.careLevel ?? resident.careLevel)}
            </Cell>
          </Row>

          <Row>
            <Cell width="12%" label>
              認定日
            </Cell>
            <Cell width="20%">
              {formatWarekiDate(care?.certificationDate, {
                includeEraName: false,
              })}
            </Cell>
            <Cell width="16%" label>
              認定の有効期間
            </Cell>
            <Cell width="52%" last>
              {formatWarekiPeriod(care?.periodStart, care?.periodEnd)}
            </Cell>
          </Row>

          <Row>
            <Cell width="16%" label>
              負担割合証
            </Cell>
            <Cell width="16%">
              <CheckboxPair checked={hasBurdenRatio} />
            </Cell>
            <Cell width="16%" label>
              認定の有効期間
            </Cell>
            <Cell width="52%" last>
              {burdenRatioPeriod(care)}
            </Cell>
          </Row>

          <Row>
            <Cell width="18%" label>
              居宅介護{"\n"}支援事業所
            </Cell>
            <Cell width="22%">{displayValue(medicalCare?.careOffice)}</Cell>
            <Cell width="10%" label>
              介護支援
            </Cell>
            <Cell width="8%" label>
              TEL
            </Cell>
            <Cell width="42%" last>
              {displayValue(medicalCare?.careOfficePhone)}
            </Cell>
          </Row>

          <Row>
            <Cell width="22%" label>
              支援事業所 指定番号
            </Cell>
            <Cell width="28%">
              {displayValue(medicalCare?.careOfficeLicenseNo) || " "}
            </Cell>
            <Cell width="10%" label>
              専門員
            </Cell>
            <Cell width="8%" label>
              氏名
            </Cell>
            <Cell width="32%" last>
              {displayValue(medicalCare?.careManagerName)}
            </Cell>
          </Row>

          <Row>
            <Cell width="12%" label>
              医療機関
            </Cell>
            <Cell width="38%">
              {displayValue(medicalCare?.medicalFacilityName)}
            </Cell>
            <Cell width="12%" label>
              主治医
            </Cell>
            <Cell width="38%" last>
              {displayValue(medicalCare?.primaryDoctor)}
            </Cell>
          </Row>

          <Row>
            <Cell width="22%" label>
              緊急時希望搬送病院
            </Cell>
            <Cell width="8%" label>
              ①
            </Cell>
            <Cell width="32%">
              {displayValue(medicalCare?.emergencyHospital)}
            </Cell>
            <Cell width="8%" label>
              ②
            </Cell>
            <Cell width="30%" last>
              {displayValue(medicalCare?.emergencyHospital2)}
            </Cell>
          </Row>

          <Row>
            <Cell width="14%" label>
              保険者番号
            </Cell>
            <Cell width="18%">{displayValue(medical?.insurerNo)}</Cell>
            <Cell width="14%" label>
              被保険者番号
            </Cell>
            <Cell width="54%" last>
              {displayValue(medical?.insuredNo)}
            </Cell>
          </Row>

          <Row>
            <Cell width="14%" label>
              有効期間
            </Cell>
            <Cell width="86%" last>
              {formatWarekiPeriod(null, medical?.expiresAt)}
            </Cell>
          </Row>

          <Row>
            <Cell width="18%" label>
              受給者証番号
            </Cell>
            <Cell width="22%">{displayValue(disability?.recipientNo)}</Cell>
            <Cell width="16%" label>
              障害支援区分
            </Cell>
            <Cell width="18%">{displayValue(disability?.supportLevel)}</Cell>
            <Cell width="12%" label>
              サービス種別
            </Cell>
            <Cell width="14%" last>
              {displayValue(disability?.serviceType)}
            </Cell>
          </Row>

          <Row>
            <Cell width="14%" label>
              支給決定期間
            </Cell>
            <Cell width="46%">
              {formatWarekiPeriod(disability?.periodStart, disability?.periodEnd)}
            </Cell>
            <Cell width="12%" label>
              支給量等
            </Cell>
            <Cell width="28%" last>
              {displayValue(disability?.serviceQuantity)}
            </Cell>
          </Row>

          <Row>
            <Cell width="14%" label>
              公費種別
            </Cell>
            <Cell width="16%" label>
              有効期限
            </Cell>
            <Cell width="18%" label>
              負担者番号
            </Cell>
            <Cell width="18%" label>
              受給者番号
            </Cell>
            <Cell width="34%" last label>
              本人負担額
            </Cell>
          </Row>

          {publicExpenseRows.map((expense, index) => (
            <Row key={expense?.id ?? `empty-${index}`}>
              <Cell width="14%">
                {expense
                  ? `${index + 1} ${displayValue(expense.kind)}`
                  : `${index + 1}`}
              </Cell>
              <Cell width="16%">
                {expense?.expiresAt
                  ? formatWarekiDate(expense.expiresAt, { includeEraName: false })
                  : "～"}
              </Cell>
              <Cell width="18%">{displayValue(expense?.payerNo)}</Cell>
              <Cell width="18%">{displayValue(expense?.recipientNo)}</Cell>
              <Cell width="34%" last>
                {formatCurrencyYen(expense?.selfBurden ?? null)}
              </Cell>
            </Row>
          ))}

          <Row>
            <Cell width="14%" label>
              ①緊急連絡先
            </Cell>
            <Cell width="16%">{displayValue(contact1?.name)}</Cell>
            <Cell width="8%" label>
              続柄
            </Cell>
            <Cell width="10%">{displayValue(contact1?.relationship)}</Cell>
            <Cell width="8%" label>
              住所
            </Cell>
            <Cell width="44%" last>
              {displayValue(contact1?.address)}
            </Cell>
          </Row>

          <Row>
            <Cell width="8%" label>
              TEL
            </Cell>
            <Cell width="18%">{displayValue(contact1?.phone)}</Cell>
            <Cell width="8%" label>
              FAX
            </Cell>
            <Cell width="18%">{""}</Cell>
            <Cell width="8%" label>
              携帯
            </Cell>
            <Cell width="40%" last>
              {displayValue(contact1?.mobile)}
            </Cell>
          </Row>

          <Row>
            <Cell width="14%" label>
              ②緊急連絡先
            </Cell>
            <Cell width="16%">{displayValue(contact2?.name)}</Cell>
            <Cell width="8%" label>
              続柄
            </Cell>
            <Cell width="10%">{displayValue(contact2?.relationship)}</Cell>
            <Cell width="8%" label>
              住所
            </Cell>
            <Cell width="44%" last>
              {displayValue(contact2?.address)}
            </Cell>
          </Row>

          <Row last>
            <Cell width="8%" label>
              TEL
            </Cell>
            <Cell width="18%">{displayValue(contact2?.phone)}</Cell>
            <Cell width="8%" label>
              FAX
            </Cell>
            <Cell width="18%">{""}</Cell>
            <Cell width="8%" label>
              携帯
            </Cell>
            <Cell width="40%" last>
              {displayValue(contact2?.mobile)}
            </Cell>
          </Row>

          <View style={styles.bottomSection}>
            <VerticalLabel text="病歴" />
            <View style={styles.bottomContent}>
              <Text style={styles.value}>
                {displayValue(resident.medicalHistory) || " "}
              </Text>
            </View>
            <VerticalLabel text="備考" />
            <View style={styles.bottomContentLast}>
              <Text style={styles.value}>
                {displayValue(resident.notes) || " "}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          {resident.facilityName} / 出力者: {exportedBy} / 出力日時:{" "}
          {exportedAt.toLocaleString("ja-JP")}
        </Text>
      </Page>
    </Document>
  );
}
