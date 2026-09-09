import { prisma } from './db';

export interface CompanyConfig {
  name: string;
  taxId: string;
  address: string;
  phone: string;
  fax?: string;
  branchName?: string;
  email: string;
  website: string;
  logoUrl?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  defaultNotes?: string;
  signaturePreparedLabel?: string;
  signatureApprovedLabel?: string;
  signatureReceivedLabel?: string;
}

export const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  name: 'บริษัท เอส แอนด์ บี อีเล็คโทรนิคส์ เซอร์วิส จำกัด',
  taxId: '0-1055-55081-71-4',
  address: '120/288 หมู่ที่ 5 ตำบลบางเดื่อ อำเภอเมืองปทุม จังหวัดปทุมธานี 12000',
  phone: '02-731-3318 , 085-920-9926',
  fax: '02-731-3308',
  branchName: 'สำนักงานใหญ่',
  email: 'contact@sbelectronic.co.th',
  website: 'www.sbelectronic.co.th',
  bankName: 'ธนาคารกสิกรไทย (KBANK)',
  bankAccountNo: '123-4-56789-0',
  bankAccountName: 'บจก. เอส แอนด์ บี อีเล็คโทรนิคส์ เซอร์วิส',
  defaultNotes: 'สินค้าตามบิลนี้ แม้จะได้ส่งมอบกับผู้ซื้อแล้ว ก็ยังเป็นทรัพย์สินของผู้ขาย จนกว่าผู้ซื้อจะชำระเงินเรียบร้อยแล้ว',
  signaturePreparedLabel: 'ผู้ส่งสินค้า / ผู้จัดทำ',
  signatureApprovedLabel: 'ผู้มีอำนาจลงนาม',
  signatureReceivedLabel: 'ผู้รับสินค้า / ลูกค้า',
};

export async function getCompanySettings(): Promise<CompanyConfig> {
  try {
    const setting = await prisma.companySetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) return DEFAULT_COMPANY_CONFIG;

    return {
      name: setting.name || DEFAULT_COMPANY_CONFIG.name,
      taxId: setting.taxId || DEFAULT_COMPANY_CONFIG.taxId,
      address: setting.address || DEFAULT_COMPANY_CONFIG.address,
      phone: setting.phone || DEFAULT_COMPANY_CONFIG.phone,
      fax: DEFAULT_COMPANY_CONFIG.fax,
      branchName: DEFAULT_COMPANY_CONFIG.branchName,
      email: setting.email || DEFAULT_COMPANY_CONFIG.email,
      website: setting.website || DEFAULT_COMPANY_CONFIG.website,
      logoUrl: setting.logoUrl || undefined,
      bankName: setting.bankName || undefined,
      bankAccountNo: setting.bankAccountNo || undefined,
      bankAccountName: setting.bankAccountName || undefined,
      defaultNotes: setting.defaultNotes || DEFAULT_COMPANY_CONFIG.defaultNotes,
      signaturePreparedLabel: setting.signaturePreparedLabel || DEFAULT_COMPANY_CONFIG.signaturePreparedLabel,
      signatureApprovedLabel: setting.signatureApprovedLabel || DEFAULT_COMPANY_CONFIG.signatureApprovedLabel,
      signatureReceivedLabel: setting.signatureReceivedLabel || DEFAULT_COMPANY_CONFIG.signatureReceivedLabel,
    };
  } catch (error) {
    console.error('Failed to load company settings from database, fallback to defaults:', error);
    return DEFAULT_COMPANY_CONFIG;
  }
}
