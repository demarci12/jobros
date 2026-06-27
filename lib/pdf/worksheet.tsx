import "server-only";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 32, color: "#1a1a1a" },
  header: { marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  row: { flexDirection: "row", borderBottom: "1px solid #f3f4f6", paddingVertical: 4 },
  headerRow: { flexDirection: "row", backgroundColor: "#f9fafb", paddingVertical: 5, fontFamily: "Helvetica-Bold" },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "right" },
  col3: { flex: 1, textAlign: "right" },
  col4: { flex: 1, textAlign: "right" },
  col5: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totalLabel: { width: 100, fontFamily: "Helvetica-Bold" },
  totalValue: { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" },
  info: { marginBottom: 4, flexDirection: "row", gap: 8 },
  label: { color: "#6b7280", width: 80 },
  value: { flex: 1 },
  signature: { marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 12 },
});

type WorksheetLine = { description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; line_total: number; is_labor: boolean };
type WorksheetPdfData = {
  jobNumber: string;
  companyName: string;
  customerName: string;
  siteAddress: string;
  serviceName: string;
  workDone: string | null;
  laborHours: number | null;
  lines: WorksheetLine[];
  issuedAt: string;
};

export function WorksheetPdf({ data }: { data: WorksheetPdfData }) {
  const subtotal = data.lines.reduce((s, l) => s + l.line_total, 0);
  const vatTotal = data.lines.reduce((s, l) => s + l.line_total * (l.vat_rate / 100), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Munkalap — {data.jobNumber}</Text>
          <Text style={styles.subtitle}>{data.companyName} · {data.issuedAt}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.info}><Text style={styles.label}>Ügyfél:</Text><Text style={styles.value}>{data.customerName}</Text></View>
          <View style={styles.info}><Text style={styles.label}>Helyszín:</Text><Text style={styles.value}>{data.siteAddress}</Text></View>
          <View style={styles.info}><Text style={styles.label}>Szolgáltatás:</Text><Text style={styles.value}>{data.serviceName}</Text></View>
          {data.laborHours && <View style={styles.info}><Text style={styles.label}>Munkaidő:</Text><Text style={styles.value}>{data.laborHours} óra</Text></View>}
        </View>

        {data.workDone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Elvégzett munka</Text>
            <Text>{data.workDone}</Text>
          </View>
        )}

        {data.lines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tételek</Text>
            <View style={styles.headerRow}>
              <Text style={styles.col1}>Megnevezés</Text>
              <Text style={styles.col2}>Menny.</Text>
              <Text style={styles.col3}>Egységár</Text>
              <Text style={styles.col4}>ÁFA%</Text>
              <Text style={styles.col5}>Nettó</Text>
            </View>
            {data.lines.map((l, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.col1}>{l.description}{l.is_labor ? " (munkadíj)" : ""}</Text>
                <Text style={styles.col2}>{l.quantity} {l.unit}</Text>
                <Text style={styles.col3}>{l.unit_price.toLocaleString("hu")} Ft</Text>
                <Text style={styles.col4}>{l.vat_rate}%</Text>
                <Text style={styles.col5}>{l.line_total.toLocaleString("hu")} Ft</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Nettó összesen:</Text>
              <Text style={styles.totalValue}>{subtotal.toLocaleString("hu")} Ft</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ÁFA:</Text>
              <Text style={styles.totalValue}>{vatTotal.toLocaleString("hu")} Ft</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Bruttó:</Text>
              <Text style={styles.totalValue}>{(subtotal + vatTotal).toLocaleString("hu")} Ft</Text>
            </View>
          </View>
        )}

        <View style={styles.signature}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 40 }}>
            <View><Text style={{ borderTop: "1px solid #000", paddingTop: 4, width: 160 }}>Ügyfél aláírása</Text></View>
            <View><Text style={{ borderTop: "1px solid #000", paddingTop: 4, width: 160 }}>Szerelő aláírása</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
