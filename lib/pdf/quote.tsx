import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 32, color: "#1a1a1a" },
  header: { marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#374151" },
  groupHeader: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#6b7280", marginBottom: 3, marginTop: 8 },
  row: { flexDirection: "row", borderBottom: "1px solid #f3f4f6", paddingVertical: 4 },
  headerRow: { flexDirection: "row", backgroundColor: "#f9fafb", paddingVertical: 5, fontFamily: "Helvetica-Bold" },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "right" },
  col3: { flex: 1, textAlign: "right" },
  col4: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  totalLabel: { width: 110, fontFamily: "Helvetica-Bold" },
  totalValue: { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold" },
  info: { marginBottom: 4, flexDirection: "row" },
  label: { color: "#6b7280", width: 80 },
  optional: { color: "#9ca3af", fontStyle: "italic" },
  validUntil: { marginTop: 8, fontSize: 9, color: "#6b7280" },
  footer: { marginTop: 24, fontSize: 9, color: "#9ca3af", textAlign: "center" },
});

const GROUP_LABELS: Record<string, string> = { good: "Alap csomag", better: "Standard csomag", best: "Prémium csomag" };

type QuoteLine = { description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; line_total: number; is_optional: boolean; option_group: string | null; is_selected: boolean };
type QuotePdfData = {
  quoteNumber: string;
  companyName: string;
  customerName: string;
  jobTitle: string;
  lines: QuoteLine[];
  validUntil: string | null;
  notes: string | null;
  issuedAt: string;
};

export function QuotePdf({ data }: { data: QuotePdfData }) {
  const groups = Array.from(new Set(data.lines.map(l => l.option_group ?? ""))).sort();
  const selectedLines = data.lines.filter(l => l.is_selected);
  const subtotal = selectedLines.reduce((s, l) => s + l.line_total, 0);
  const vatTotal = selectedLines.reduce((s, l) => s + l.line_total * (l.vat_rate / 100), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Árajánlat — {data.quoteNumber}</Text>
          <Text style={styles.subtitle}>{data.companyName} · {data.issuedAt}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.info}><Text style={styles.label}>Ügyfél:</Text><Text>{data.customerName}</Text></View>
          <View style={styles.info}><Text style={styles.label}>Tárgy:</Text><Text>{data.jobTitle}</Text></View>
          {data.validUntil && <Text style={styles.validUntil}>Érvényes: {data.validUntil}-ig</Text>}
        </View>

        {groups.map(group => {
          const groupLines = data.lines.filter(l => (l.option_group ?? "") === group);
          return (
            <View key={group || "base"} style={styles.section}>
              {group && <Text style={styles.groupHeader}>{GROUP_LABELS[group] ?? group}</Text>}
              <View style={styles.headerRow}>
                <Text style={styles.col1}>Megnevezés</Text>
                <Text style={styles.col2}>Menny.</Text>
                <Text style={styles.col3}>Egységár</Text>
                <Text style={styles.col4}>Nettó</Text>
              </View>
              {groupLines.map((l, i) => (
                <View key={i} style={[styles.row, !l.is_selected ? { opacity: 0.5 } : {}]}>
                  <Text style={styles.col1}>{l.description}{l.is_optional ? " *" : ""}</Text>
                  <Text style={styles.col2}>{l.quantity} {l.unit}</Text>
                  <Text style={styles.col3}>{l.unit_price.toLocaleString("hu")} Ft</Text>
                  <Text style={styles.col4}>{l.line_total.toLocaleString("hu")} Ft</Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Nettó (kiválasztott):</Text>
          <Text style={styles.totalValue}>{subtotal.toLocaleString("hu")} Ft</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>ÁFA:</Text>
          <Text style={styles.totalValue}>{vatTotal.toLocaleString("hu")} Ft</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Bruttó összesen:</Text>
          <Text style={styles.totalValue}>{(subtotal + vatTotal).toLocaleString("hu")} Ft</Text>
        </View>

        {data.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Megjegyzés</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>* Opcionális tétel — az ügyfél döntése alapján kerülhet be a végső megrendelésbe.</Text>
      </Page>
    </Document>
  );
}
