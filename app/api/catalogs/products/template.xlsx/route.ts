import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ishflow';
  const sheet = workbook.addWorksheet('Products');

  sheet.columns = [{ header: 'name', key: 'name', width: 40 }];
  for (let i = 1; i <= 10; i++) {
    sheet.addRow({ name: `Ürün ${i}` });
  }

  const header = sheet.getRow(1);
  header.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="products-template.xlsx"',
    },
  });
}
