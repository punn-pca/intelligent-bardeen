import { DEFAULT_COMPANY_CONFIG, CompanyConfig } from '@/lib/company-config';

export interface DocumentPrintData {
  documentNo: string;
  documentType: string;
  status: string;
  issueDate: string;
  customer?: { name: string; taxId?: string; address?: string; phone?: string; branch?: string } | null;
  supplier?: { name: string; taxId?: string; address?: string; phone?: string; branch?: string } | null;
  warehouse?: { name: string; code: string } | null;
  targetWarehouse?: { name: string; code: string } | null;
  items: Array<{
    product?: { sku?: string; name?: string; unit?: string } | null;
    quantity: number;
    unitCost?: number;
    unitPrice?: number;
    discount?: number;
    totalCost?: number;
    totalPrice?: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  notes?: string;
  createdBy?: { name: string };
  approvedBy?: { name: string };
  companyConfig?: CompanyConfig;
}

const DOCUMENT_TITLE_TH: Record<string, string> = {
  PR: 'ใบขอซื้อ',
  PO: 'ใบสั่งซื้อ',
  GRN: 'ใบรับสินค้า',
  QUOTATION: 'ใบเสนอราคา',
  SO: 'ใบสั่งขาย',
  DELIVERY_NOTE: 'ใบส่งสินค้า/ใบกำกับภาษี',
  STOCK_ISSUE: 'ใบเบิกอะไหล่',
  STOCK_TRANSFER: 'ใบโอนสินค้าระหว่างคลัง',
  STOCK_ADJUSTMENT: 'ใบปรับปรุงสต๊อกสินค้า',
  STOCK_RETURN: 'ใบคืนสินค้า',
  INVOICE: 'ใบส่งสินค้า/ใบกำกับภาษี',
  RECEIPT: 'ใบเสร็จรับเงิน',
  PAYMENT_VOUCHER: 'ใบสำคัญจ่าย',
  CREDIT_NOTE: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
};

// Thai Baht Number to Text Converter
export function thaiBahtText(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '';
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const convertInt = (nStr: string): string => {
    let res = '';
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr[i], 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          res += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          res += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1) {
          res += 'เอ็ด';
        } else {
          res += THAI_NUMBERS[digit] + THAI_UNITS[pos % 6];
        }
      }
    }
    return res;
  };

  const fixed = (num || 0).toFixed(2);
  const parts = fixed.split('.');
  const intPart = parseInt(parts[0], 10);
  const decPart = parseInt(parts[1], 10);

  let result = convertInt(intPart.toString()) + 'บาท';
  if (decPart === 0) {
    result += 'ถ้วน';
  } else {
    result += convertInt(parts[1]) + 'สตางค์';
  }

  return result;
}

export function generateDocumentHTML(doc: DocumentPrintData): string {
  const title = DOCUMENT_TITLE_TH[doc?.documentType || ''] || doc?.documentType || 'เอกสาร';
  const comp = doc?.companyConfig || DEFAULT_COMPANY_CONFIG;
  const party = doc?.customer || doc?.supplier;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  const formattedDate = formatDate(doc?.issueDate);
  const bahtText = thaiBahtText(doc?.grandTotal || 0);

  const isReceipt = doc?.documentType === 'RECEIPT';
  const isRequisition = doc?.documentType === 'STOCK_ISSUE' || doc?.documentType === 'STOCK_TRANSFER';

  const safeItems = Array.isArray(doc?.items) ? doc.items : [];

  const itemRows = safeItems
    .map((item, idx) => {
      const price = item.unitPrice ?? item.unitCost ?? 0;
      const qty = item.quantity ?? 1;
      const total = item.totalPrice ?? item.totalCost ?? (price * qty);
      const isFree = price === 0;

      const sku = item.product?.sku || '-';
      const name = item.product?.name || 'รายการสินค้า';

      return `
    <tr>
      <td style="text-align: center; vertical-align: top;">${idx + 1}</td>
      ${isRequisition ? `<td style="vertical-align: top; font-family: monospace;">${sku}</td>` : ''}
      <td style="vertical-align: top;">${name}</td>
      <td style="text-align: center; vertical-align: top;">${qty.toLocaleString()}</td>
      <td style="text-align: right; vertical-align: top;">${isFree ? '-' : price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; vertical-align: top;">${isFree ? '-' : total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
    `;
    })
    .join('');

  // Pad empty rows to maintain form height
  const minRows = 8;
  const emptyRowsCount = Math.max(0, minRows - safeItems.length);
  const emptyRows = Array.from({ length: emptyRowsCount })
    .map(
      () => `
    <tr>
      <td style="height: 24px;"></td>
      ${isRequisition ? `<td></td>` : ''}
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  `
    )
    .join('');

  const subtotalVal = doc?.subtotal ?? 0;
  const taxVal = doc?.tax ?? 0;
  const grandTotalVal = doc?.grandTotal ?? 0;

  return `
  <!DOCTYPE html>
  <html lang="th">
  <head>
    <meta charset="UTF-8">
    <title>${doc?.documentNo || 'Document'} - ${title}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }
      * { box-sizing: border-box; }
      body {
        font-family: 'Sarabun', 'Garuda', 'Angsana New', sans-serif;
        color: #000;
        margin: 0;
        padding: 0;
        font-size: 13px;
        line-height: 1.4;
        background: #fff;
      }
      .page-container {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        padding: 10px;
      }

      /* Header Layout */
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }
      .company-title {
        font-size: 18px;
        font-weight: bold;
        color: #000;
      }
      .company-details {
        font-size: 12px;
        color: #000;
      }
      .doc-header-title {
        font-size: 20px;
        font-weight: bold;
        text-align: right;
        vertical-align: top;
      }

      /* Box Header */
      .box-container {
        width: 100%;
        border: 1.5px solid #000;
        border-radius: 4px;
        margin-bottom: 10px;
        border-collapse: collapse;
      }
      .box-container td {
        padding: 6px 10px;
        vertical-align: top;
      }
      .box-left {
        width: 62%;
        border-right: 1.5px solid #000;
      }
      .box-right {
        width: 38%;
      }

      .field-label {
        font-weight: bold;
        display: inline-block;
      }
      .checkbox-group {
        margin-top: 6px;
        display: flex;
        gap: 20px;
        align-items: center;
      }
      .checkbox-custom {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 1.5px solid #000;
        text-align: center;
        line-height: 12px;
        font-size: 11px;
        font-weight: bold;
        margin-right: 4px;
        vertical-align: middle;
      }

      /* Items Table */
      .items-table {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #000;
        margin-bottom: 0;
      }
      .items-table th {
        border: 1px solid #000;
        border-bottom: 1.5px solid #000;
        padding: 6px 4px;
        font-size: 12px;
        font-weight: bold;
        text-align: center;
        background-color: #fff;
      }
      .items-table td {
        border-left: 1px solid #000;
        border-right: 1px solid #000;
        border-bottom: none;
        padding: 5px 6px;
        font-size: 12px;
      }

      /* Summary Box */
      .summary-container {
        width: 100%;
        border: 1.5px solid #000;
        border-top: none;
        border-collapse: collapse;
      }
      .summary-container td {
        padding: 4px 8px;
        vertical-align: middle;
      }
      .baht-text-cell {
        border-right: 1.5px solid #000;
        text-align: center;
        font-weight: bold;
        font-size: 13px;
      }
      .summary-label {
        font-weight: bold;
        text-align: right;
        border-bottom: 1px solid #000;
        width: 110px;
      }
      .summary-val {
        text-align: right;
        font-weight: bold;
        border-bottom: 1px solid #000;
        width: 90px;
      }

      /* Footer Remarks & Signatures */
      .remarks-box {
        border: 1.5px solid #000;
        border-top: none;
        padding: 8px 10px;
        font-size: 11px;
        line-height: 1.5;
      }
      .payment-checkboxes {
        margin-top: 10px;
        display: flex;
        align-items: center;
        gap: 25px;
        font-size: 12px;
      }

      .sig-line-input {
        display: inline-block;
        border-bottom: 1px solid #000;
        min-width: 180px;
        text-align: center;
      }

      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="page-container">
      <!-- Header -->
      <table class="header-table">
        <tr>
          <td style="width: 65%;">
            <div class="company-title">${comp.name}</div>
            <div class="company-details">${comp.address}</div>
            <div class="company-details">Tel: ${comp.phone} ${comp.fax ? `Fax: ${comp.fax}` : ''}</div>
            <div class="company-details">เลขประจำตัวผู้เสียภาษี ${comp.taxId} (${comp.branchName || 'สำนักงานใหญ่'})</div>
          </td>
          <td style="width: 35%; text-align: right;" valign="top">
            <div class="doc-header-title">${title}</div>
          </td>
        </tr>
      </table>

      <!-- Document & Customer Box -->
      <table class="box-container">
        <tr>
          <td class="box-left">
            <div><span class="field-label">เลขที่ :</span> ${doc?.documentNo || '-'} &nbsp;&nbsp;&nbsp; <span class="field-label">เลขประจำตัวผู้เสียภาษี :</span> ${party?.taxId || '-'}</div>
            <div style="margin-top: 3px;"><span class="field-label">นามลูกค้า :</span> ${party?.name || '-'}</div>
            <div style="margin-top: 3px;"><span class="field-label">ที่อยู่ :</span> ${party?.address || '-'}</div>
            <div style="margin-top: 3px;"><span class="field-label">เบอร์ติดต่อ :</span> ${party?.phone || '-'}</div>
            
            <div class="checkbox-group">
              <div><span class="checkbox-custom">${party?.branch === 'สาขาที่' ? '' : '✓'}</span> สำนักงานใหญ่</div>
              <div><span class="checkbox-custom">${party?.branch === 'สาขาที่' ? '✓' : ''}</span> สาขาที่ ....................</div>
            </div>
          </td>

          <td class="box-right">
            <div style="margin-bottom: 15px;"><span class="field-label">วันที่ :</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${formattedDate}</div>
            
            ${
              isReceipt
                ? `
            <div style="margin-top: 25px; text-align: center;">
              <div>.........................................................................</div>
              <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">ผู้มีอำนาจลงนาม</div>
            </div>
            <div style="margin-top: 25px; text-align: center;">
              <div>.........................................................................</div>
              <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">ผู้รับชำระเงิน</div>
            </div>
            `
                : isRequisition
                ? `
            <div style="margin-top: 50px; text-align: center;">
              <div><span class="field-label">ลงชื่อผู้เบิก :</span> .....................................................</div>
            </div>
            `
                : `
            <div style="margin-top: 25px;"><span class="field-label">ผู้ส่งสินค้า :</span> <span class="sig-line-input"></span></div>
            <div style="margin-top: 25px;"><span class="field-label">ผู้รับสินค้า :</span> <span class="sig-line-input"></span></div>
            `
            }
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 8%;">ลำดับที่</th>
            ${isRequisition ? `<th style="width: 15%;">รหัส</th>` : ''}
            <th style="text-align: center;">รายการสินค้า</th>
            <th style="width: 12%;">จำนวน</th>
            <th style="width: 15%;">ราคา/หน่วย</th>
            <th style="width: 18%;">ราคารวม</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${emptyRows}
        </tbody>
      </table>

      <!-- Summary Section -->
      <table class="summary-container">
        <tr>
          <td class="baht-text-cell">
            ${bahtText}
          </td>
          <td style="padding: 0; width: 200px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td class="summary-label">รวมราคาสินค้า</td>
                <td class="summary-val">${subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="summary-label">ภาษีมูลค่าเพิ่ม</td>
                <td class="summary-val">${taxVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="summary-label" style="border-bottom: none;">รวมสุทธิ</td>
                <td class="summary-val" style="border-bottom: none;">${grandTotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Footer Remarks & Terms -->
      <div class="remarks-box">
        ${
          isReceipt
            ? `
        <div style="text-align: center; font-size: 11px;">กรณีชำระด้วยเช็ค หรือกรณีโอนเข้าบัญชี ใบเสร็จฉบับนี้จะสมบูรณ์เมื่อทางบริษัทฯ ได้รับเงินเข้าบัญชีครบเรียบร้อยแล้ว</div>
        <div class="payment-checkboxes">
          <div><span class="field-label">ได้รับชำระเงิน</span></div>
          <div><span class="checkbox-custom"></span> เงินสด</div>
          <div><span class="checkbox-custom"></span> เช็ค ธนาคาร........................................ เลขที่........................................</div>
          <div><span class="checkbox-custom"></span> โอนเข้าบัญชี</div>
        </div>
        `
            : `
        <div><strong>หมายเหตุ :</strong></div>
        <div style="padding-left: 20px;">
          <div>1. สินค้าตามบิลนี้ แม้จะได้ส่งมอบกับผู้ซื้อแล้ว ก็ยังเป็นทรัพย์สินของผู้ขาย จนกว่าผู้ซื้อจะชำระเงินเรียบร้อยแล้ว</div>
          <div>2. การชำระเงินหากล่าช้าเกินกำหนด บริษัทฯ จะคิดเบี้ยปรับในอัตราร้อยละ 1.5 ต่อเดือน</div>
          <div>3. สินค้าที่ส่งตามบิลนี้ หากไม่มีการโต้แย้งภายใน 7 วัน หลังจากส่งมอบสินค้า ทางบริษัทฯ ถือว่าสินค้ามีความถูกต้อง เรียบร้อยแล้ว ทางบริษัทฯ จะไม่รับคืนหรือเปลี่ยน ถึงแม้จะเป็นการจัดส่งทาง EMS หรือ บริษัทฯ ขนส่ง</div>
        </div>
        `
        }
      </div>
    </div>
  </body>
  </html>
  `;
}
