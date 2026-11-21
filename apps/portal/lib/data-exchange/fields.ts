/**
 * Data Exchange — what each kind of record looks like in a file. Pure (no
 * database, no framework; relative imports only), shared by the screens, the
 * server actions, the templates and the tests.
 *
 * Every field lists the column names it is recognised by: plain English as
 * people type them in Excel, and the column headers Zoho Books, Zoho Invoice
 * and Zoho CRM write in their exports ("Display Name", "EmailID", "Billing
 * City", "Invoice Number", "Account Name"…), so those files map themselves.
 * Matching ignores case, spaces, dots, dashes and underscores. The field
 * names of a standard SAP export (KUNNR, NAME1, TELF1…) are recognised too,
 * for the SAP link (lib/modules.ts); while it is off they are never shown.
 */
import { featureOn, moduleIsOn } from '../modules';

export type EntityKey = 'staff' | 'customers' | 'vehicles' | 'suppliers' | 'parts' | 'stock' | 'invoices' | 'jobs' | 'openJobs' | 'openServices' | 'warranties' | 'claims' | 'plantShipments' | 'plantVehicles' | 'plantKits' | 'plantKitIssues' | 'registers';

export type FieldDef = {
  key: string;
  label: string;
  /** What to put in the column (shown on the mapping screen and in the template). */
  help: string;
  /** Column names this field is recognised by (plain names, Zoho's, and SAP field names). */
  aliases: string[];
  /** An example value for the template. */
  example: string;
  /** Required for every row; otherwise the row is rejected. */
  required?: boolean;
  /** A short list of accepted values (shown as a dropdown in the Excel template). */
  choices?: string[];
  /** Only for updating records from an edited export (P10): read, never in a template. */
  roundTrip?: boolean;
  /** Only SAP's files carry it (company code, fiscal year…): left out of the templates and the column matching while the SAP link is off. Still read when a file has it. */
  sapOnly?: boolean;
};

export type EntityDef = {
  key: EntityKey;
  label: string;
  /** "customer" / "vehicle", for sentences. */
  noun: string;
  plural: string;
  description: string;
  /** Who may approve it (on top of the Data Exchange approval permission): the department that owns these records. */
  needs: 'crm.manage' | 'store.parts.manage' | 'workshop.close.approve' | 'warranty.claim.approve' | 'admin.users.manage' | 'plant.kit.release';
  /** Loads into one branch (its catalogue / stock / sales / workshop), chosen when the import starts. */
  branch?: boolean;
  /** What kind of branch it loads into (lib/branch-types.ts): a store (parts, stock, invoices) or a workshop (job history). */
  branchArea?: 'store' | 'workshop' | 'plant';
  /** Read-only history (v-A3): shown and counted, never edited; undo voids it. */
  history?: boolean;
  /** Finance confirms the totals after loading (opening stock, invoice history). */
  financeSignOff?: boolean;
  /** Who approves, in words. */
  approver: string;
  /** In this order, a row is matched to an existing record. */
  matchOrder: string[];
  /** Load this before (e.g. customers before their vehicles). */
  after?: EntityKey;
  fields: FieldDef[];
};

export const ENTITIES: Record<EntityKey, EntityDef> = {
  staff: {
    key: 'staff',
    label: 'Staff',
    noun: 'staff member',
    plural: 'staff',
    description: 'The organisation’s people, from a staff list or an HR export (Zoho People and the like): each becomes an EJO account in their branch and department, with their roles, switched off until an administrator of the whole organisation sends them their invitation to set a password. Load staff first: open job cards and services find their technicians and supervisors by employee ID. Administrators are never brought in by a file.',
    needs: 'admin.users.manage',
    approver: 'an Organisation Administrator',
    matchOrder: ['work email', 'employee ID'],
    fields: [
      { key: 'fullName', label: 'Full name', help: 'As it should appear in EJO (first and last name together). A file with first and last names in two columns (Zoho People) needs no full-name column.', aliases: ['ENAME', 'full name', 'name', 'employee name', 'staff name', 'employee', 'display name'], example: 'Adaeze Obi', required: true },
      { key: 'firstName', label: 'First name', help: 'Optional: when the file has first and last names in their own columns, they make the full name.', aliases: ['first name', 'firstname', 'given name', 'forename'], example: '' },
      { key: 'lastName', label: 'Last name', help: 'Optional: see First name.', aliases: ['last name', 'lastname', 'surname', 'family name'], example: '' },
      { key: 'email', label: 'Work email', help: 'The person’s own work address: they sign in with it and their invitation goes to it. Never a shared mailbox.', aliases: ['work email', 'email', 'e-mail', 'email address', 'email id', 'emailid', 'USRID_LONG', 'official email'], example: 'adaeze.obi@example.com', required: true },
      { key: 'phone', label: 'Phone', help: 'Optional: work phone.', aliases: ['phone', 'mobile', 'telephone', 'phone number', 'work phone', 'mobile phone', 'TELNR'], example: '0803 123 4567' },
      { key: 'employeeId', label: 'Employee ID', help: 'Optional: the staff number EJO should use (the HR number). Empty: EJO issues one for the branch (ORG-BRANCH-NNNN). Open job cards and services find people by it.', aliases: ['employee id', 'employee number', 'employee no', 'staff id', 'staff number', 'staff no', 'emp id'], example: 'EMP-0042' },
      { key: 'personnelNumber', label: 'Personnel number', help: 'Optional: the number in the HR or payroll records, when it is not the employee ID. Kept and searchable.', aliases: ['PERNR', 'SAP personnel number', 'personnel number', 'personnel no', 'sap number', 'hr number'], example: '00012345' },
      { key: 'branch', label: 'Branch', help: 'The branch they work at: its name or its code, as on the Structure page.', aliases: ['branch', 'branch name', 'location', 'location name', 'site', 'WERKS', 'plant', 'BTRTL', 'work location'], example: 'Victoria Island Workshop', required: true },
      { key: 'department', label: 'Department', help: 'Optional: their department in that branch, by name (as on the Structure page).', aliases: ['department', 'dept', 'unit', 'section', 'ORGEH', 'org unit'], example: 'Cars and SUVs' },
      { key: 'roles', label: 'Roles', help: 'Optional: their EJO roles by name, separated by ";" — e.g. "Technician; Front Desk". They must exist (Roles). Administrator roles are given by hand, never by a file. Empty: no role yet (they see only their own account).', aliases: ['roles', 'role', 'ejo role', 'ejo roles', 'access', 'position', 'job role'], example: 'Technician' },
    ],
  },
  customers: {
    key: 'customers',
    label: 'Customers',
    noun: 'customer',
    plural: 'customers',
    description: 'People and organisations you serve: names, phone numbers, emails, addresses, customer numbers — from Zoho Books or Zoho Invoice (Contacts → Export), Zoho CRM (Contacts or Accounts → Export), an old system or your own spreadsheet.',
    needs: 'crm.manage',
    approver: 'a Workshop manager, the Customer care lead or an administrator',
    matchOrder: ['customer number', 'email', 'phone'],
    fields: [
      { key: 'ejoRecord', label: 'EJO record', help: 'Only to update records from an edited export: the record’s EJO number, as the export writes it (“EJO record”, ZZ_EJO_ID). Leave it out to add new records.', aliases: ['EJO record', 'ZZ_EJO_ID', 'EJO ID', 'EJO record id', 'EJO number'], example: '', roundTrip: true },
      { key: 'externalId', label: 'Customer number', help: 'The customer’s number in Zoho (Customer ID, Contact ID) or your old system. Used to recognise the customer again in later files.', aliases: ['Customer number (SAP or old system)', 'KUNNR', 'PARTNER', 'BU_PARTNER', 'SAP / old-system number', 'customer SAP number', 'customer number', 'customer no', 'customer id', 'customer code', 'contact id', 'account id', 'record id', 'account number', 'account no', 'debtor', 'debtor number', 'bp number', 'business partner'], example: '1000123' },
      { key: 'fullName', label: 'Name', help: 'The person’s full name, or the organisation’s name (Zoho: Display Name). A file with first and last names in two columns, or only a company name, needs no name column.', aliases: ['NAME1', 'NAME_ORG1', 'name', 'full name', 'display name', 'contact name', 'customer name', 'customer', 'client name', 'client'], example: 'Ada Okafor', required: true },
      { key: 'firstName', label: 'First name', help: 'Optional (Zoho First Name): with Last name, makes the name when there is no name column.', aliases: ['first name', 'firstname', 'contact first name', 'given name'], example: '' },
      { key: 'lastName', label: 'Last name', help: 'Optional (Zoho Last Name).', aliases: ['last name', 'lastname', 'contact last name', 'surname'], example: '' },
      { key: 'name2', label: 'Name, second line', help: 'Optional: added after the name (e.g. a branch or "Attn" line).', aliases: ['NAME2', 'NAME_ORG2', 'name 2', 'second name', 'name line 2'], example: '' },
      { key: 'customerType', label: 'Type', help: 'Individual or Organisation. Left empty: Organisation when a company name is given, otherwise Individual.', aliases: ['customer type', 'customer sub type', 'customer subtype', 'type', 'category', 'customer category', 'BPKIND', 'KTOKD'], example: 'Individual', choices: ['Individual', 'Organisation'] },
      { key: 'companyName', label: 'Company name', help: 'For organisations: the registered company name, if different from the name.', aliases: ['company', 'company name', 'account name', 'organisation', 'organization', 'organisation name', 'business name', 'employer'], example: '' },
      { key: 'email', label: 'Email', help: 'Optional. Only the customer’s own address: it is how they sign in to the customer portal. Leave empty if there is none — never a made-up one.', aliases: ['SMTP_ADDR', 'email', 'e-mail', 'email address', 'email id', 'emailid', 'mail', 'e mail'], example: 'ada.okafor@example.com' },
      { key: 'phone', label: 'Phone', help: 'The main number, e.g. 0803 123 4567 or +234 803 123 4567.', aliases: ['TELF1', 'TEL_NUMBER', 'phone', 'phone number', 'telephone', 'tel', 'mobile', 'mobile number', 'gsm', 'cell', 'contact number'], example: '0803 123 4567' },
      { key: 'altPhone', label: 'Second phone', help: 'Optional second number.', aliases: ['TELF2', 'MOB_NUMBER', 'second phone', 'alt phone', 'alternative phone', 'phone 2', 'mobile 2', 'other phone', 'mobile phone', 'mobilephone'], example: '' },
      { key: 'address', label: 'Address', help: 'Street and area, one line (e.g. "Plot 3, Cheesebrough"). Long addresses are kept in full as an extra address.', aliases: ['STRAS', 'STREET', 'address', 'address line 1', 'street', 'street address', 'address 1', 'billing address', 'billing street', 'billing address line 1', 'mailing street', 'mailing address'], example: 'Plot 3, Adeola Odeku Street' },
      { key: 'city', label: 'City', help: 'Optional.', aliases: ['ORT01', 'CITY1', 'city', 'town', 'billing city', 'mailing city'], example: 'Lagos' },
      { key: 'state', label: 'State', help: 'Optional.', aliases: ['REGIO', 'REGION', 'state', 'region', 'province', 'billing state', 'mailing state'], example: 'Lagos' },
      { key: 'taxId', label: 'Tax ID', help: 'Optional, for organisations (TIN / VAT number).', aliases: ['STCD1', 'STCEG', 'TAXNUM', 'tin', 'tax id', 'tax number', 'vat', 'vat number', 'tax registration number', 'tax reg no'], example: '' },
      { key: 'paymentTerms', label: 'Payment terms', help: 'Optional (Zoho Payment Terms, e.g. "Net 30"). Kept on the customer as a tag; credit terms themselves are set in EJO by Finance or the Manager (Customers → the organisation’s page).', aliases: ['payment terms', 'payment terms label', 'terms', 'credit terms'], example: '' },
      { key: 'tags', label: 'Tags', help: 'Optional labels separated by commas, e.g. "Fleet, VIP".', aliases: ['tags', 'labels', 'group', 'segment', 'customer group', 'KDGRP'], example: 'Fleet' },
      { key: 'whatsappOptIn', label: 'WhatsApp updates', help: 'Optional: Yes only when the customer has agreed to receive updates on WhatsApp. Anything else (or no column) leaves it off; it can be switched on later on their page or by the customer.', aliases: ['whatsapp', 'whatsapp updates', 'whatsapp opt in', 'whatsapp optin', 'whatsapp consent', 'agrees to whatsapp', 'whatsapp ok'], example: 'Yes', choices: ['Yes', 'No'] },
      { key: 'customerSince', label: 'Customer since', help: 'Optional: when they became a customer (Zoho Created Time, or the date the old system opened the account), e.g. 14.03.2019. Used for “customer since” and the analytics instead of the day of the import.', aliases: ['ERDAT', 'CRDAT', 'customer since', 'created on', 'creation date', 'date created', 'created', 'created time', 'opened on', 'account opened', 'first purchase', 'since'], example: '14.03.2019' },
    ],
  },
  vehicles: {
    key: 'vehicles',
    label: 'Vehicles',
    noun: 'vehicle',
    plural: 'vehicles',
    description: 'Customers’ vehicles: chassis number (VIN), plate, engine number, make, model, year, mileage — each linked to its customer.',
    needs: 'crm.manage',
    approver: 'a Workshop manager, the Customer care lead or an administrator',
    matchOrder: ['vehicle number', 'chassis number (VIN)', 'plate'],
    after: 'customers',
    fields: [
      { key: 'ejoRecord', label: 'EJO record', help: 'Only to update records from an edited export: the record’s EJO number, as the export writes it (“EJO record”, ZZ_EJO_ID). Leave it out to add new records.', aliases: ['EJO record', 'ZZ_EJO_ID', 'EJO ID', 'EJO record id', 'EJO number'], example: '', roundTrip: true },
      { key: 'customerExternalId', label: 'Customer number', help: 'Whose vehicle it is: the customer number from the customers file. Or give the customer’s email or phone instead.', aliases: ['Customer number (SAP or old system)', 'KUNNR', 'customer SAP number', 'customer number', 'customer no', 'customer id', 'customer code', 'owner number', 'account number', 'bp number', 'business partner'], example: '1000123' },
      { key: 'customerEmail', label: 'Customer email', help: 'Alternative way to find the customer.', aliases: ['customer email', 'owner email', 'email'], example: '' },
      { key: 'customerPhone', label: 'Customer phone', help: 'Alternative way to find the customer.', aliases: ['customer phone', 'owner phone', 'phone', 'telephone', 'mobile'], example: '' },
      { key: 'externalId', label: 'Vehicle number', help: 'Optional: the vehicle’s number in your old system or fleet list.', aliases: ['Vehicle number (SAP or old system)', 'EQUNR', 'SAP / old-system number', 'equipment', 'equipment number', 'vehicle id', 'vehicle number', 'asset number', 'fleet number'], example: '' },
      { key: 'chassisNumber', label: 'Chassis number (VIN)', help: 'The 17-character VIN. A chassis number or a plate is needed for every vehicle.', aliases: ['VIN', 'VHVIN', 'FIN', 'chassis', 'chassis number', 'chassis no', 'vin number', 'frame number'], example: 'AHTGB3CD401234567' },
      { key: 'plateNumber', label: 'Plate number', help: 'The registration plate, e.g. LND 123 AB.', aliases: ['plate', 'plate number', 'plate no', 'registration', 'registration number', 'reg no', 'reg number', 'LICENSE_NUM', 'LICNUM', 'number plate'], example: 'LND 123 AB' },
      { key: 'engineNumber', label: 'Engine number', help: 'Optional.', aliases: ['engine number', 'engine no', 'ENGINE_NO', 'motor number'], example: '2GD-1234567' },
      { key: 'engineType', label: 'Engine type', help: 'Optional, e.g. 2GD-FTV, 2.5 petrol.', aliases: ['engine type', 'engine', 'engine model'], example: '2GD-FTV' },
      { key: 'make', label: 'Make', help: 'e.g. Toyota, Ford, Nissan, Mitsubishi, Hyundai, Mercedes-Benz.', aliases: ['make', 'brand', 'manufacturer', 'MAKE', 'vehicle make'], example: 'Toyota' },
      { key: 'model', label: 'Model', help: 'e.g. Hilux, Hiace, Land Cruiser, Camry, Ranger.', aliases: ['model', 'MODEL', 'vehicle model', 'model name', 'model description'], example: 'Hilux' },
      { key: 'year', label: 'Year', help: 'Year of manufacture, e.g. 2024.', aliases: ['year', 'model year', 'MODEL_YEAR', 'year of manufacture', 'yom', 'manufacture year'], example: '2024' },
      { key: 'vehicleType', label: 'Passenger or Commercial', help: 'Passenger (cars, SUVs) or Commercial (trucks, buses, vans). Left empty: worked out from the model where it is obvious, otherwise left blank.', aliases: ['vehicle type', 'category', 'vehicle category', 'type', 'segment'], example: 'Commercial', choices: ['Passenger', 'Commercial'] },
      { key: 'mileage', label: 'Mileage (km)', help: 'Last known odometer reading in kilometres.', aliases: ['mileage', 'odometer', 'km', 'kilometres', 'kilometers', 'odometer reading', 'last mileage'], example: '45200' },
    ],
  },
  suppliers: {
    key: 'suppliers',
    label: 'Suppliers',
    noun: 'supplier',
    plural: 'suppliers',
    description: 'The organisation’s suppliers (SAP vendors): names, vendor numbers, contacts. Shared by every branch; goods receipts link to them.',
    needs: 'store.parts.manage',
    approver: 'a Store manager or an administrator',
    matchOrder: ['SAP / old system number', 'name'],
    fields: [
      { key: 'ejoRecord', label: 'EJO record', help: 'Only to update records from an edited export: the record’s EJO number, as the export writes it (“EJO record”, ZZ_EJO_ID). Leave it out to add new records.', aliases: ['EJO record', 'ZZ_EJO_ID', 'EJO ID', 'EJO record id', 'EJO number'], example: '', roundTrip: true },
      { key: 'externalId', label: 'Supplier number (SAP or old system)', help: 'The vendor number in SAP (LIFNR) or your old system.', aliases: ['LIFNR', 'supplier number (SAP)', 'SAP / old-system number', 'vendor', 'vendor number', 'vendor no', 'supplier number', 'supplier no', 'supplier code', 'creditor', 'creditor number'], example: '0000300045' },
      { key: 'name', label: 'Name', help: 'The supplier’s name.', aliases: ['NAME1', 'name', 'supplier', 'supplier name', 'vendor name', 'company'], example: 'Isuzu Motors Africa', required: true },
      { key: 'name2', label: 'Name, second line', help: 'Optional: added after the name (SAP NAME2).', aliases: ['NAME2', 'name 2'], example: '' },
      { key: 'contactName', label: 'Contact person', help: 'Optional.', aliases: ['contact', 'contact person', 'contact name', 'attention'], example: 'Sales desk' },
      { key: 'phone', label: 'Phone', help: 'Optional.', aliases: ['TELF1', 'phone', 'telephone', 'tel', 'mobile'], example: '+27 41 403 9111' },
      { key: 'email', label: 'Email', help: 'Optional.', aliases: ['SMTP_ADDR', 'email', 'e-mail'], example: 'orders@example.com' },
      { key: 'address', label: 'Address', help: 'Optional, one line.', aliases: ['STRAS', 'address', 'street'], example: 'Struandale, Port Elizabeth' },
      { key: 'city', label: 'City', help: 'Optional.', aliases: ['ORT01', 'city', 'town'], example: '' },
      { key: 'taxId', label: 'Tax ID', help: 'Optional (TIN / VAT number).', aliases: ['STCD1', 'STCEG', 'tin', 'tax id', 'vat'], example: '' },
    ],
  },
  parts: {
    key: 'parts',
    label: 'Parts',
    noun: 'part',
    plural: 'parts',
    description: 'The parts catalogue (SAP material master): part numbers, descriptions, units, material groups, tracking, prices, reorder levels — into one branch’s Store.',
    needs: 'store.parts.manage',
    approver: 'a Store manager or an administrator',
    branch: true,
    matchOrder: ['SAP / old system number', 'part number'],
    fields: [
      { key: 'ejoRecord', label: 'EJO record', help: 'Only to update records from an edited export: the record’s EJO number, as the export writes it (“EJO record”, ZZ_EJO_ID). Leave it out to add new records.', aliases: ['EJO record', 'ZZ_EJO_ID', 'EJO ID', 'EJO record id', 'EJO number'], example: '', roundTrip: true },
      { key: 'partNumber', label: 'Part number', help: 'The part (material) number — SAP MATNR. Unique in the branch.', aliases: ['MATNR', 'material', 'material number', 'part number', 'part no', 'part code', 'item code', 'item number', 'sku', 'article number'], example: '8-98123456-0', required: true },
      { key: 'name', label: 'Description', help: 'What the part is called — SAP MAKTX.', aliases: ['MAKTX', 'material description', 'description', 'part name', 'name', 'item description', 'short text'], example: 'Brake pad set, front (NQR)', required: true },
      { key: 'category', label: 'Material group / category', help: 'Optional: the SAP material group (MATKL) or your own category.', aliases: ['MATKL', 'material group', 'category', 'product group', 'group'], example: 'BRAKES' },
      { key: 'baseUnit', label: 'Base unit', help: 'The unit stock is counted in — SAP MEINS (ST, EA, PC, L, KG…). Empty: Piece.', aliases: ['MEINS', 'base unit', 'unit', 'uom', 'unit of measure', 'bun'], example: 'ST' },
      { key: 'trackingType', label: 'Tracking', help: 'Quantity, Batch or Serial. SAP batch-managed (XCHPF = X) becomes Batch. Empty: Quantity.', aliases: ['tracking', 'tracking type', 'XCHPF', 'batch managed', 'SERNP', 'serial profile'], example: 'Quantity', choices: ['Quantity', 'Batch', 'Serial'] },
      { key: 'barcode', label: 'Barcode', help: 'Optional — SAP EAN11.', aliases: ['EAN11', 'barcode', 'ean', 'gtin', 'upc'], example: '' },
      { key: 'sellingPrice', label: 'Selling price (₦)', help: 'Optional: the price per base unit.', aliases: ['selling price', 'price', 'list price', 'sales price', 'retail price', 'KBETR', 'VKP'], example: '45000' },
      { key: 'reorderPoint', label: 'Reorder point', help: 'Optional — SAP MINBE.', aliases: ['MINBE', 'reorder point', 'reorder level', 'min stock', 'minimum stock'], example: '4' },
      { key: 'safetyStock', label: 'Safety stock', help: 'Optional — SAP EISBE.', aliases: ['EISBE', 'safety stock', 'buffer stock'], example: '2' },
      { key: 'altUnit', label: 'Alternative unit', help: 'Optional: a unit it also comes in (SAP MEINH), e.g. Carton, Drum.', aliases: ['MEINH', 'alternative unit', 'alt unit', 'pack unit', 'purchase unit'], example: '' },
      { key: 'altFactor', label: 'Base units in the alternative unit', help: 'How many base units one alternative unit holds (SAP UMREZ), e.g. 12.', aliases: ['UMREZ', 'conversion', 'conversion factor', 'pack size', 'units per pack'], example: '' },
      { key: 'externalId', label: 'Number in SAP or the old system', help: 'Optional, when it differs from the part number (e.g. the old material number BISMT). From SAP and left empty: the part number.', aliases: ['BISMT', 'SAP / old-system number', 'old material number', 'old part number', 'legacy number'], example: '' },
    ],
  },
  stock: {
    key: 'stock',
    label: 'Opening stock',
    noun: 'stock line',
    plural: 'stock lines',
    description: 'What each part of one branch’s Store holds at the cut-over, with its cost (SAP stock and valuation). Loaded as opening-balance goods receipts, so stock value, FIFO costs and the inventory analytics include it.',
    needs: 'store.parts.manage',
    approver: 'a Store manager or an administrator, then Finance confirms the totals',
    branch: true,
    financeSignOff: true,
    matchOrder: ['part number'],
    after: 'parts',
    fields: [
      { key: 'partNumber', label: 'Part number', help: 'The part (material) number — SAP MATNR. The part must be in the branch’s catalogue already.', aliases: ['MATNR', 'material', 'material number', 'part number', 'part no', 'item code', 'sku'], example: '8-98123456-0', required: true },
      { key: 'quantity', label: 'Quantity on hand', help: 'Unrestricted stock — SAP LABST — in the unit below.', aliases: ['LABST', 'unrestricted', 'unrestricted stock', 'quantity', 'qty', 'on hand', 'stock', 'quantity on hand', 'closing stock'], example: '12', required: true },
      { key: 'unit', label: 'Unit', help: 'Optional: the unit of the quantity (SAP MEINS). Empty: the part’s base unit.', aliases: ['MEINS', 'unit', 'uom', 'bun'], example: 'ST' },
      { key: 'totalValue', label: 'Stock value (₦)', help: 'The value of this stock — SAP SALK3. Give this or the unit cost.', aliases: ['SALK3', 'stock value', 'total value', 'value', 'valuation', 'amount'], example: '540000' },
      { key: 'unitCost', label: 'Unit cost (₦)', help: 'The cost of one unit — SAP moving average price VERPR (or standard price STPRS). Used when no stock value is given.', aliases: ['VERPR', 'STPRS', 'unit cost', 'cost price', 'cost', 'moving average price', 'standard price', 'price'], example: '45000' },
      { key: 'priceUnit', label: 'Price unit', help: 'SAP PEINH: the number of units the unit cost is for (a cost per 100 has 100 here). Empty: 1.', aliases: ['PEINH', 'price unit', 'per'], example: '' },
      { key: 'batch', label: 'Batch', help: 'SAP CHARG. Needed for batch-tracked parts.', aliases: ['CHARG', 'batch', 'batch number', 'lot', 'lot number'], example: '' },
      { key: 'serials', label: 'Serial numbers', help: 'For serial-tracked parts: one per unit, separated by commas or semicolons.', aliases: ['SERNR', 'serial', 'serials', 'serial numbers', 'serial number'], example: '' },
      { key: 'storageLocation', label: 'Storage location', help: 'Optional — SAP LGORT. Kept on the receipt’s notes.', aliases: ['LGORT', 'storage location', 'sloc', 'location', 'bin'], example: '0001' },
    ],
  },
  invoices: {
    key: 'invoices',
    label: 'Invoice history',
    noun: 'invoice',
    plural: 'invoices',
    description: 'Invoices from before EJO 100 — Zoho Books or Zoho Invoice (Invoices → Export), an old system or your own spreadsheet: date, number, customer, vehicle, amount. Read-only history that counts in each customer’s spend, last visit and the analytics. A Zoho export with one row per item is understood: the first row of each invoice is loaded with the invoice total; its other rows are reported as the same invoice.',
    needs: 'crm.manage',
    approver: 'a Workshop manager, the Customer care lead or an administrator, then Finance confirms the totals',
    branch: true,
    history: true,
    financeSignOff: true,
    matchOrder: ['invoice number'],
    after: 'customers',
    fields: [
      { key: 'invoiceNumber', label: 'Invoice number', help: 'The invoice’s number in Zoho or the old system. Each invoice is loaded once.', aliases: ['VBELN', 'BELNR', 'invoice number (SAP)', 'invoice number', 'invoice no', 'invoice#', 'invoice', 'billing document', 'document number', 'doc no', 'document no', 'reference'], example: 'INV-000123', required: true },
      { key: 'invoiceDate', label: 'Invoice date', help: 'The date on the invoice, e.g. 14.03.2023.', aliases: ['FKDAT', 'BUDAT', 'BLDAT', 'invoice date', 'billing date', 'posting date', 'document date', 'date'], example: '14.03.2023', required: true },
      { key: 'customerExternalId', label: 'Customer number', help: 'The customer the invoice is for, by the number in the customers file (Zoho Customer ID). The customer must be imported first.', aliases: ['KUNAG', 'KUNRG', 'KUNNR', 'customer number (SAP)', 'customer SAP number', 'customer number', 'customer no', 'customer id', 'contact id', 'customer', 'sold-to', 'sold to party', 'payer', 'account number', 'bp number'], example: '1000123' },
      { key: 'customerPhone', label: 'Customer phone', help: 'Alternative way to find the customer.', aliases: ['customer phone', 'phone', 'telephone', 'mobile'], example: '' },
      { key: 'customerName', label: 'Customer name', help: 'Optional (Zoho Customer Name): finds the customer when there is no number or phone, if exactly one customer has that name.', aliases: ['customer name', 'contact name', 'client name', 'display name', 'bill to'], example: '' },
      { key: 'amount', label: 'Amount (₦)', help: 'The invoice amount in naira (Zoho Total). A net amount: add the tax column below to make it gross. Negative for a credit note (100- is understood).', aliases: ['NETWR', 'DMBTR', 'WRBTR', 'amount (incl. tax)', 'amount', 'total', 'invoice total', 'invoice amount', 'grand total', 'gross amount', 'net value', 'value'], example: '485000.00', required: true },
      { key: 'balance', label: 'Balance (₦)', help: 'Optional (Zoho Balance): what was still owed when the file was made. Shown with the invoice.', aliases: ['balance', 'balance due', 'amount due', 'outstanding', 'open amount'], example: '' },
      { key: 'dueDate', label: 'Due date', help: 'Optional (Zoho Due Date). Shown with the invoice.', aliases: ['due date', 'payment due date', 'due on', 'ZFBDT'], example: '' },
      { key: 'invoiceStatus', label: 'Status', help: 'Optional (Zoho Invoice Status: Paid, Overdue, Sent, Partially Paid, Void). Shown with the invoice; a void invoice is reported, never loaded.', aliases: ['invoice status', 'status', 'payment status'], example: '' },
      { key: 'tax', label: 'Tax (₦)', help: 'Optional: the tax amount, added to a net amount.', aliases: ['MWSBK', 'MWSTS', 'tax', 'tax amount', 'vat', 'vat amount'], example: '36375.00' },
      { key: 'currency', label: 'Currency', help: 'Optional: the currency code. Only naira (NGN) is loaded.', aliases: ['WAERK', 'WAERS', 'currency', 'currency code', 'curr'], example: 'NGN' },
      { key: 'vin', label: 'Chassis number (VIN)', help: 'Optional: the vehicle the work was on. Links the invoice to the vehicle when it is in the system.', aliases: ['VHVIN', 'VIN', 'chassis', 'chassis number', 'chassis no', 'vehicle', 'frame number'], example: 'AHTGB3CD401234567' },
      { key: 'companyCode', label: 'Company code', help: 'Optional: the company the invoice was issued by, when the old system numbered each company’s invoices on their own (give it when the same number can appear twice).', aliases: ['BUKRS', 'company code', 'company', 'cocd'], example: '1000', sapOnly: true },
      { key: 'fiscalYear', label: 'Fiscal year', help: 'Optional: the financial year, when invoice numbers start again each year. Empty: the year of the invoice date.', aliases: ['GJAHR', 'fiscal year', 'fy', 'year'], example: '2023', sapOnly: true },
      { key: 'documentType', label: 'Document type', help: 'Optional: the kind of document, e.g. Invoice or Credit note.', aliases: ['FKART', 'BLART', 'document type', 'billing type', 'doc type', 'type'], example: 'F2', sapOnly: true },
      { key: 'description', label: 'Description', help: 'Optional: what the invoice was for (Zoho Item Name or Item Desc).', aliases: ['ARKTX', 'SGTXT', 'BKTXT', 'description', 'item name', 'item desc', 'item description', 'text', 'item text', 'narration', 'details'], example: 'Routine service and brake pads' },
      { key: 'itemQuantity', label: 'Quantity', help: 'Optional (Zoho Quantity): added to the description.', aliases: ['quantity', 'qty', 'item quantity'], example: '' },
      { key: 'itemPrice', label: 'Item price (₦)', help: 'Optional (Zoho Item Price or Rate): added to the description.', aliases: ['item price', 'rate', 'unit price', 'price'], example: '' },
    ],
  },
  jobs: {
    key: 'jobs',
    label: 'Job card history',
    noun: 'past job card',
    plural: 'past job cards',
    description: 'Job cards closed before EJO 100 — from Zoho, an old system or your own spreadsheet: the vehicle, the customer, when it was opened and finished, the mileage, the work and the amount. Read-only history: shown on the customer and the vehicle, counted as a visit; a job card whose work was a service also starts the vehicle’s next-service clock.',
    needs: 'workshop.close.approve',
    approver: 'a Workshop manager or an administrator',
    branch: true,
    branchArea: 'workshop',
    history: true,
    matchOrder: ['job number'],
    after: 'customers',
    fields: [
      { key: 'jobNumber', label: 'Job number', help: 'The job card’s number in the old system. Each job card is loaded once.', aliases: ['AUFNR', 'order', 'order number', 'service order', 'job number', 'job no', 'job card number', 'job card no', 'job card', 'jc number', 'jc no', 'work order', 'work order number', 'wo number', 'ro number', 'repair order'], example: '482913', required: true },
      { key: 'orderType', label: 'Order type', help: 'Optional: the kind of job in the old system.', aliases: ['AUART', 'QMART', 'order type', 'notification type', 'type'], example: 'SM01', sapOnly: true },
      { key: 'notificationNumber', label: 'Notification number', help: 'Optional: the complaint or request number in the old system.', aliases: ['QMNUM', 'notification', 'notification number', 'notification no', 'complaint number'], example: '300045678', sapOnly: true },
      { key: 'customerExternalId', label: 'Customer number', help: 'Whose vehicle it was: the customer number from the customers file. Or give the customer’s phone or email. When the vehicle is already in EJO, its owner is used.', aliases: ['Customer number (SAP)', 'KUNUM', 'KUNNR', 'KUNAG', 'customer SAP number', 'customer number', 'customer no', 'customer', 'sold-to', 'account number', 'bp number', 'partner'], example: '1000123' },
      { key: 'customerPhone', label: 'Customer phone', help: 'Alternative way to find the customer.', aliases: ['customer phone', 'phone', 'telephone', 'mobile'], example: '' },
      { key: 'customerEmail', label: 'Customer email', help: 'Alternative way to find the customer.', aliases: ['customer email', 'email', 'e-mail'], example: '' },
      { key: 'vin', label: 'Chassis number (VIN)', help: 'The vehicle the work was on. Links the job card to the vehicle when it is in EJO; a VIN or a plate is needed for the service clock.', aliases: ['VHVIN', 'VIN', 'chassis', 'chassis number', 'chassis no', 'frame number', 'vehicle'], example: 'AHTGB3CD401234567' },
      { key: 'plateNumber', label: 'Plate number', help: 'Optional: the registration plate, used to find the vehicle when there is no VIN.', aliases: ['LICENSE_NUM', 'LICNUM', 'plate', 'plate number', 'plate no', 'registration', 'registration number', 'reg no'], example: 'LND 123 AB' },
      { key: 'equipmentNumber', label: 'Equipment number', help: 'Optional: the vehicle’s number in the old system or fleet list.', aliases: ['EQUNR', 'equipment', 'equipment number', 'equipment no'], example: '' },
      { key: 'openedAt', label: 'Opened on', help: 'When the job card was opened, e.g. 14.03.2023.', aliases: ['ERDAT', 'GSTRP', 'opened on', 'opened', 'date opened', 'created on', 'creation date', 'start date', 'date in', 'check-in date', 'received', 'date'], example: '14.03.2023', required: true },
      { key: 'completedAt', label: 'Completed on', help: 'When the work was finished. Empty: shown as opened only; the service clock then counts from the day it was opened.', aliases: ['IDAT2', 'GLTRP', 'IDAT3', 'completed on', 'completed', 'date completed', 'finished on', 'finished', 'closed on', 'closed', 'date out', 'completion date', 'checkout date', 'checked out'], example: '16.03.2023' },
      { key: 'mileage', label: 'Mileage (km)', help: 'The odometer reading at the visit, in kilometres. It anchors the next-service clock.', aliases: ['RECDV', 'READG', 'mileage', 'odometer', 'km', 'kilometres', 'kilometers', 'odometer reading', 'mileage at service', 'counter reading'], example: '41200' },
      { key: 'description', label: 'Complaint / work requested', help: 'What was written on the job card, e.g. "Carry out service". A job card whose text says service is also treated as a service inside EJO (it starts the next-service clock).', aliases: ['KTEXT', 'QMTXT', 'description', 'short text', 'complaint', 'work requested', 'request', 'text', 'details', 'job description'], example: 'Carry out service 40,000 km; brakes squeal' },
      { key: 'workDone', label: 'Work done', help: 'Optional: what was done.', aliases: ['LTXA1', 'work done', 'work performed', 'operations', 'repairs', 'remarks', 'notes', 'findings'], example: 'Oil and filters changed; front pads replaced' },
      { key: 'technician', label: 'Technician', help: 'Optional: who did the work (name or employee ID). Seen by staff only, never by customers.', aliases: ['PERNR', 'technician', 'mechanic', 'done by', 'worked by', 'assigned to', 'personnel number'], example: 'E. Okoro' },
      { key: 'workCentre', label: 'Work centre', help: 'Optional: the bay or work area.', aliases: ['ARBPL', 'work centre', 'work center', 'bay', 'workshop bay'], example: 'WS-BAY2' },
      { key: 'labourAmount', label: 'Labour (₦)', help: 'Optional: labour charged, in naira.', aliases: ['labour', 'labor', 'labour amount', 'labour charge', 'labour cost'], example: '35000' },
      { key: 'partsAmount', label: 'Parts (₦)', help: 'Optional: parts charged, in naira.', aliases: ['parts', 'parts amount', 'parts charge', 'parts cost', 'materials'], example: '128500' },
      { key: 'totalAmount', label: 'Total (₦)', help: 'Optional: the total charged. Empty: labour + parts when either is given.', aliases: ['NETWR', 'total', 'total amount', 'amount', 'invoice amount', 'invoice total', 'value', 'gross amount'], example: '163500' },
      { key: 'invoiceNumber', label: 'Invoice number', help: 'Optional: the invoice the job card was billed on — shown beside it, and matched to the invoice history when it is loaded.', aliases: ['VBELN', 'invoice', 'invoice number', 'invoice no', 'invoice#', 'billing document', 'bill number'], example: 'INV-000123' },
      { key: 'status', label: 'Status', help: 'Optional: Closed or Cancelled. Empty: Closed. A job card still open belongs in the open job cards file, not here.', aliases: ['status', 'order status', 'system status', 'ISTAT', 'STAT', 'user status'], example: 'Closed', choices: ['Closed', 'Cancelled'] },
      { key: 'branch', label: 'Branch', help: 'Optional: the branch the work was done at. When given it must be the branch chosen for this import.', aliases: ['branch', 'branch name', 'workshop', 'location', 'WERKS', 'IWERK', 'plant'], example: 'Victoria Island Workshop' },
    ],
  },
  openJobs: {
    key: 'openJobs',
    label: 'Open job cards (at the cut-over)',
    noun: 'open job card',
    plural: 'open job cards',
    description: 'The job cards still in the workshop on the day EJO takes over: each becomes a live EJO job card at its stage — old number kept, estimate marked approved before EJO, parts issued before EJO, deposits as opening payments that Finance confirms — with the customer and vehicle already in EJO. No emails are sent.',
    needs: 'workshop.close.approve',
    approver: 'a Workshop manager or an administrator, then Finance confirms the opening payments',
    branch: true,
    branchArea: 'workshop',
    financeSignOff: true,
    matchOrder: ['job number'],
    after: 'vehicles',
    fields: [
      { key: 'jobNumber', label: 'Job number', help: 'The job card’s number in the old system. Kept on the EJO job card and searchable; EJO gives it its own JC number.', aliases: ['AUFNR', 'order', 'order number', 'service order', 'job number', 'job no', 'job card number', 'job card no', 'job card', 'jc number', 'work order', 'wo number', 'repair order'], example: '483211', required: true },
      { key: 'customerExternalId', label: 'Customer number', help: 'Whose vehicle it is: the customer number from the customers file, or give the phone or email. When the vehicle is in EJO, its owner is used.', aliases: ['Customer number (SAP)', 'KUNUM', 'KUNNR', 'KUNAG', 'customer SAP number', 'customer number', 'customer no', 'customer', 'account number', 'bp number', 'partner'], example: '1000123' },
      { key: 'customerPhone', label: 'Customer phone', help: 'Alternative way to find the customer.', aliases: ['customer phone', 'phone', 'telephone', 'mobile'], example: '' },
      { key: 'customerEmail', label: 'Customer email', help: 'Alternative way to find the customer.', aliases: ['customer email', 'email', 'e-mail'], example: '' },
      { key: 'vin', label: 'Chassis number (VIN)', help: 'The vehicle in the workshop. It must already be in EJO (load the vehicles file first); give the VIN or the plate.', aliases: ['VHVIN', 'VIN', 'chassis', 'chassis number', 'chassis no', 'frame number', 'vehicle'], example: 'AHTGB3CD401234567' },
      { key: 'plateNumber', label: 'Plate number', help: 'Alternative way to find the vehicle.', aliases: ['LICENSE_NUM', 'LICNUM', 'plate', 'plate number', 'plate no', 'registration', 'registration number', 'reg no'], example: 'LND 123 AB' },
      { key: 'openedAt', label: 'Opened on', help: 'When the vehicle came in, e.g. 28.10.2026. The EJO job card carries this date.', aliases: ['ERDAT', 'GSTRP', 'opened on', 'opened', 'date opened', 'created on', 'check-in date', 'date in', 'received', 'date'], example: '28.10.2026', required: true },
      { key: 'status', label: 'Stage', help: 'Where the job card is: Checked in, In progress, Awaiting parts, Quality check, Awaiting customer approval, Completed or Ready for collection. A closed or cancelled job card belongs in the job card history file.', aliases: ['stage', 'status', 'job status', 'order status', 'system status', 'user status', 'ISTAT', 'STAT'], example: 'In progress', choices: ['Checked in', 'In progress', 'Awaiting parts', 'Quality check', 'Awaiting customer approval', 'Completed', 'Ready for collection'] },
      { key: 'mileage', label: 'Mileage at check-in (km)', help: 'Optional: the odometer reading when the vehicle came in.', aliases: ['RECDV', 'mileage', 'odometer', 'km', 'mileage at check-in', 'odometer reading'], example: '41200' },
      { key: 'complaint', label: 'Complaint / work requested', help: 'What the customer asked for, as written on the job card. Several complaints: separate them with ";".', aliases: ['KTEXT', 'QMTXT', 'complaint', 'complaints', 'work requested', 'description', 'short text', 'request', 'job description'], example: 'Carry out service 40,000 km; brakes squeal', required: true },
      { key: 'diagnosis', label: 'Findings so far', help: 'Optional: the technician’s findings or work done so far.', aliases: ['LTXA1', 'findings', 'diagnosis', 'work done', 'work so far', 'notes', 'remarks'], example: 'Front pads worn to the metal' },
      { key: 'technician', label: 'Technician (employee ID)', help: 'Optional: the technician’s employee ID in EJO. A name is tried too; nobody found leaves the job card unassigned.', aliases: ['PERNR', 'technician', 'technician id', 'mechanic', 'assigned to', 'employee id', 'personnel number'], example: 'EMP-0042' },
      { key: 'supervisor', label: 'Supervisor (employee ID)', help: 'Optional: the supervising person’s employee ID in EJO. Empty: left for the workshop to set.', aliases: ['supervisor', 'supervisor id', 'service advisor', 'advisor', 'foreman'], example: 'EMP-0007' },
      { key: 'labourAmount', label: 'Labour estimate (₦)', help: 'Optional: labour on the approved estimate, in naira.', aliases: ['labour', 'labor', 'labour amount', 'labour estimate', 'labour charge'], example: '35000' },
      { key: 'partsAmount', label: 'Parts estimate (₦)', help: 'Optional: parts on the approved estimate, in naira (the part lines below add up to it; any remainder is one line).', aliases: ['parts', 'parts amount', 'parts estimate', 'materials'], example: '128500' },
      { key: 'estimateTotal', label: 'Estimate total (₦)', help: 'Optional: the approved estimate’s total. Empty: labour + parts.', aliases: ['estimate', 'estimate total', 'quotation', 'quote', 'total', 'total amount', 'NETWR', 'amount'], example: '163500' },
      { key: 'estimateApproved', label: 'Estimate approved', help: 'Yes when the customer approved the estimate before EJO (the default when amounts are given); No when it is still waiting for the customer.', aliases: ['estimate approved', 'approved', 'customer approved', 'approval'], example: 'Yes', choices: ['Yes', 'No'] },
      { key: 'partsIssued', label: 'Parts issued', help: 'Optional: parts already issued from the store before EJO, one per item separated by ";" — part number or name, "x" quantity, "@" unit price: "8-97366-430-0 x2 @45000; Oil filter x1 @6500". Shown on the estimate as issued before EJO; stock is not moved (the opening stock already counts them out).', aliases: ['parts issued', 'issued parts', 'parts used', 'materials issued', 'components', 'items'], example: '8-97366-430-0 x2 @45000; Oil filter x1 @6500' },
      { key: 'paidAmount', label: 'Paid so far (₦)', help: 'Optional: deposits or payments already taken on this job card before EJO. Recorded as an opening payment; Finance confirms the total after the load.', aliases: ['paid', 'paid so far', 'deposit', 'deposit paid', 'amount paid', 'payments', 'advance'], example: '50000' },
      { key: 'paymentMethod', label: 'How it was paid', help: 'Optional: Bank transfer or Cash. Empty: Bank transfer.', aliases: ['payment method', 'how paid', 'method', 'paid by'], example: 'Bank transfer', choices: ['Bank transfer', 'Cash'] },
      { key: 'paymentReference', label: 'Payment reference', help: 'Optional: the receipt or transfer reference from the old system.', aliases: ['payment reference', 'receipt', 'receipt number', 'receipt no', 'transfer reference', 'reference'], example: 'RCPT-2026-0412' },
      { key: 'paidOn', label: 'Paid on', help: 'Optional: when the deposit was taken. Empty: the opening date.', aliases: ['paid on', 'payment date', 'receipt date', 'date paid'], example: '28.10.2026' },
      { key: 'notes', label: 'Notes', help: 'Optional: anything the workshop should know (kept on the job card’s notes).', aliases: ['note', 'internal notes', 'comments', 'memo'], example: 'Customer wants the old parts back' },
      { key: 'branch', label: 'Branch', help: 'Optional: the branch the job card is in. When given it must be the branch chosen for this import.', aliases: ['branch', 'branch name', 'workshop', 'location', 'WERKS', 'IWERK', 'plant'], example: 'Victoria Island Workshop' },
    ],
  },
  openServices: {
    key: 'openServices',
    label: 'Open services and bookings (at the cut-over)',
    noun: 'open service or booking',
    plural: 'open services and bookings',
    description: 'The routine services still in the workshop on the day EJO takes over, and the bookings already in the diary for the days after: each becomes an EJO Vehicle Service — a booking waits for the customer on its day and time, a service in the workshop carries on at its stage — old number kept, on the customer and vehicle already in EJO. No emails are sent.',
    needs: 'workshop.close.approve',
    approver: 'a Workshop manager or an administrator',
    branch: true,
    branchArea: 'workshop',
    matchOrder: ['booking or service number'],
    after: 'vehicles',
    fields: [
      { key: 'serviceNumber', label: 'Booking or service number', help: 'The booking or service number in the old system or diary. Kept on the EJO Vehicle Service and searchable; EJO gives it its own SV number.', aliases: ['AUFNR', 'QMNUM', 'booking number', 'booking no', 'booking', 'booking reference', 'appointment', 'appointment number', 'service number', 'service no', 'order', 'order number', 'reference'], example: 'BK-2026-0612', required: true },
      { key: 'customerExternalId', label: 'Customer number', help: 'Whose vehicle it is: the customer number from the customers file, or give the phone or email. When the vehicle is in EJO, its owner is used.', aliases: ['Customer number (SAP)', 'KUNUM', 'KUNNR', 'customer SAP number', 'customer number', 'customer no', 'customer', 'account number'], example: '1000123' },
      { key: 'customerPhone', label: 'Customer phone', help: 'Alternative way to find the customer.', aliases: ['customer phone', 'phone', 'telephone', 'mobile'], example: '' },
      { key: 'customerEmail', label: 'Customer email', help: 'Alternative way to find the customer.', aliases: ['customer email', 'email', 'e-mail'], example: '' },
      { key: 'vin', label: 'Chassis number (VIN)', help: 'The vehicle. It must already be in EJO; give the VIN or the plate.', aliases: ['VHVIN', 'VIN', 'chassis', 'chassis number', 'chassis no', 'frame number', 'vehicle'], example: 'AHTGB3CD401234567' },
      { key: 'plateNumber', label: 'Plate number', help: 'Alternative way to find the vehicle.', aliases: ['LICENSE_NUM', 'LICNUM', 'plate', 'plate number', 'plate no', 'registration', 'registration number'], example: 'LND 123 AB' },
      { key: 'status', label: 'Stage', help: 'Booked (the default: the customer is expected), Checked in, In service, Completed or Ready for collection. A closed, collected or cancelled service is history.', aliases: ['stage', 'status', 'booking status', 'service status', 'STAT'], example: 'Booked', choices: ['Booked', 'Checked in', 'In service', 'Completed', 'Ready for collection'] },
      { key: 'bookedFor', label: 'Booked for (date)', help: 'For a booking: the day the customer is expected, e.g. 12.11.2026.', aliases: ['GSTRP', 'booked for', 'booking date', 'appointment date', 'date booked for', 'due date', 'date'], example: '12.11.2026' },
      { key: 'bookedTime', label: 'Time', help: 'Optional: the time of the booking, e.g. 09:30. Empty: 09:00.', aliases: ['time', 'booking time', 'appointment time', 'slot', 'GSUZP'], example: '09:30' },
      { key: 'checkedInOn', label: 'Checked in on', help: 'For a service already in the workshop: the day the vehicle came in.', aliases: ['ERDAT', 'checked in on', 'check-in date', 'date in', 'received', 'opened on'], example: '30.10.2026' },
      { key: 'mileage', label: 'Mileage (km)', help: 'Optional: the odometer when it came in.', aliases: ['RECDV', 'mileage', 'odometer', 'km'], example: '41200' },
      { key: 'complaint', label: 'Work requested', help: 'What the customer asked for: "Service 40,000 km; check the brakes". Several: separate them with ";".', aliases: ['KTEXT', 'complaint', 'complaints', 'work requested', 'reason', 'description', 'request', 'service requested'], example: 'Service 40,000 km; check the brakes' },
      { key: 'supervisor', label: 'Supervisor (employee ID)', help: 'Optional: the supervising person’s employee ID in EJO (a name is tried too). Empty: left for the workshop to set.', aliases: ['supervisor', 'supervisor id', 'service advisor', 'advisor', 'foreman'], example: 'EMP-0007' },
      { key: 'technician', label: 'Technician (employee ID)', help: 'Optional, for a service in the workshop: the technician’s employee ID or name.', aliases: ['PERNR', 'technician', 'technician id', 'mechanic', 'assigned to'], example: 'EMP-0042' },
      { key: 'notes', label: 'Notes', help: 'Optional: anything the workshop should know.', aliases: ['note', 'notes', 'remarks', 'comments'], example: 'Customer will wait' },
      { key: 'branch', label: 'Branch', help: 'Optional: the branch. When given it must be the branch chosen for this import.', aliases: ['branch', 'branch name', 'workshop', 'location', 'WERKS', 'IWERK', 'plant'], example: 'Victoria Island Workshop' },
    ],
  },
  warranties: {
    key: 'warranties',
    label: 'Warranties (sold before EJO)',
    noun: 'warranty',
    plural: 'warranties',
    description: 'The warranties on vehicles sold, and on serial-numbered parts fitted, before EJO: each becomes an EJO warranty (WR number) under one of EJO’s warranty policies, its old number kept and searchable, on the customer and vehicle already in EJO. Active from the day it started: the import’s two people are its registration and its verification. Nobody is emailed.',
    needs: 'warranty.claim.approve',
    approver: 'the Warranty HOD or a Branch Manager',
    matchOrder: ['warranty number'],
    after: 'vehicles',
    fields: [
      { key: 'warrantyNumber', label: 'Warranty number', help: 'The warranty’s number in SAP (master warranty MGANR, or the warranty counter) or the old system. Kept on the EJO warranty and searchable; EJO gives it its own WR number.', aliases: ['MGANR', 'warranty number', 'warranty no', 'warranty', 'warranty id', 'certificate', 'certificate number', 'certificate no', 'master warranty'], example: 'W-2024-0412', required: true },
      { key: 'kind', label: 'Covers', help: 'Vehicle (the default) or Part. A part warranty names the part number and, when it has one, its serial.', aliases: ['covers', 'kind', 'type', 'warranty type', 'object type'], example: 'Vehicle', choices: ['Vehicle', 'Part'] },
      { key: 'vin', label: 'Chassis number (VIN)', help: 'The vehicle covered (VHVIN). It must already be in EJO (load the vehicles file first); give the VIN or the plate. For a part, the vehicle it is fitted to, when known.', aliases: ['VHVIN', 'VIN', 'chassis', 'chassis number', 'chassis no', 'frame number', 'vehicle', 'EQUNR', 'equipment'], example: 'AHTGB3CD401234567' },
      { key: 'plateNumber', label: 'Plate number', help: 'Alternative way to find the vehicle (LICENSE_NUM).', aliases: ['LICENSE_NUM', 'LICNUM', 'plate', 'plate number', 'plate no', 'registration', 'registration number', 'reg no'], example: 'LND 123 AB' },
      { key: 'customerExternalId', label: 'Customer number (SAP)', help: 'Whose warranty it is (KUNNR), or give the phone or email. For a vehicle, its owner in EJO is used.', aliases: ['KUNNR', 'KUNUM', 'customer SAP number', 'customer number', 'customer no', 'customer', 'account number', 'bp number', 'partner'], example: '1000123' },
      { key: 'customerPhone', label: 'Customer phone', help: 'Alternative way to find the customer.', aliases: ['customer phone', 'phone', 'telephone', 'mobile'], example: '' },
      { key: 'customerEmail', label: 'Customer email', help: 'Alternative way to find the customer.', aliases: ['customer email', 'email', 'e-mail'], example: '' },
      { key: 'policy', label: 'Warranty policy', help: 'The EJO warranty policy it is under, by its code or name (Warranty → Policies). Empty: the policy with the same provider, months and km is used, when there is exactly one.', aliases: ['policy', 'policy code', 'warranty policy', 'warranty plan', 'plan', 'warranty terms', 'terms'], example: 'ISZ-NQR-36' },
      { key: 'provider', label: 'Provider', help: 'Optional: who stands behind it (the manufacturer or supplier). When given it must be the policy’s provider.', aliases: ['provider', 'warranty provider', 'manufacturer', 'warrantor', 'vendor', 'LIFNR'], example: 'Isuzu Motors' },
      { key: 'months', label: 'Months', help: 'Optional: the warranty’s length in months, to find the policy when none is named.', aliases: ['months', 'duration', 'warranty months', 'period', 'term'], example: '36' },
      { key: 'distanceLimit', label: 'Km limit', help: 'Optional: the distance limit in km, to find the policy when none is named.', aliases: ['km', 'km limit', 'distance', 'distance limit', 'mileage limit', 'kilometres'], example: '100000' },
      { key: 'startsAt', label: 'Starts on', help: 'The day the warranty started — the delivery or fitting date (GWLDT), e.g. 14.03.2024.', aliases: ['GWLDT', 'starts on', 'start date', 'warranty start', 'start', 'delivery date', 'sale date', 'date sold', 'fitted on', 'from'], example: '14.03.2024', required: true },
      { key: 'endsAt', label: 'Ends on', help: 'Optional: the day it ends (GWLEN). Empty: worked out from the policy.', aliases: ['GWLEN', 'ends on', 'end date', 'warranty end', 'expiry', 'expiry date', 'valid until', 'until', 'to'], example: '13.03.2027' },
      { key: 'startReading', label: 'Odometer at start (km)', help: 'Optional: the reading on the day it started, for the km limit.', aliases: ['start reading', 'odometer at start', 'odometer at delivery', 'delivery mileage', 'start km', 'mileage', 'RECDV'], example: '25' },
      { key: 'partNumber', label: 'Part number', help: 'For a part warranty: the part (MATNR), as in EJO’s parts catalogue.', aliases: ['MATNR', 'part number', 'part no', 'part', 'material', 'material number'], example: '8-97366-430-0' },
      { key: 'serialNumber', label: 'Serial number', help: 'Optional, for a part warranty: the part’s serial (SERNR).', aliases: ['SERNR', 'serial', 'serial number', 'serial no'], example: 'ALT-2024-0091' },
      { key: 'evidence', label: 'Evidence', help: 'The sales invoice, delivery note or fitting record it rests on, e.g. "Invoice 90012345 of 14.03.2024". Kept on the warranty.', aliases: ['evidence', 'invoice', 'invoice number', 'delivery note', 'document', 'reference', 'VBELN'], example: 'Invoice 90012345' },
      { key: 'status', label: 'Status', help: 'Active (the default), Suspended, Void or Transferred. An expired warranty is fine: EJO works expiry out from the dates.', aliases: ['status', 'warranty status', 'state'], example: 'Active', choices: ['Active', 'Suspended', 'Void', 'Transferred'] },
      { key: 'notes', label: 'Notes', help: 'Optional: anything to keep with it (the reason for a suspension, for example).', aliases: ['note', 'notes', 'remarks', 'comments', 'reason'], example: '' },
    ],
  },
  claims: {
    key: 'claims',
    label: 'Open warranty claims (at the cut-over)',
    noun: 'open warranty claim',
    plural: 'open warranty claims',
    description: 'The warranty claims still open on the day EJO takes over: each becomes a live EJO claim (WC number) at its stage — drafted, with the Warranty HOD or the Manager, approved, with the provider, accepted or rejected — on its warranty, its old number kept and searchable, and carries on in EJO from there. Settled and cancelled claims are history and stay in the old system. Nobody is emailed.',
    needs: 'warranty.claim.approve',
    approver: 'the Warranty HOD or a Branch Manager',
    matchOrder: ['claim number'],
    after: 'warranties',
    fields: [
      { key: 'claimNumber', label: 'Claim number', help: 'The claim’s number in SAP (CLMNO, or the notification QMNUM) or the old system. Kept on the EJO claim and searchable; EJO gives it its own WC number.', aliases: ['CLMNO', 'QMNUM', 'claim number', 'claim no', 'claim', 'claim id', 'notification', 'notification number'], example: 'C-2026-0187', required: true },
      { key: 'warrantyNumber', label: 'Warranty number', help: 'The warranty it is claimed on: its old number (as in the warranties file) or its EJO WR number. Empty: the vehicle’s warranty in force on the failure date, when there is exactly one.', aliases: ['MGANR', 'warranty number', 'warranty no', 'warranty', 'certificate', 'certificate number'], example: 'W-2024-0412' },
      { key: 'vin', label: 'Chassis number (VIN)', help: 'Optional: the vehicle, to find its warranty when no warranty number is given.', aliases: ['VHVIN', 'VIN', 'chassis', 'chassis number', 'chassis no', 'vehicle'], example: 'AHTGB3CD401234567' },
      { key: 'plateNumber', label: 'Plate number', help: 'Optional: alternative way to find the vehicle.', aliases: ['LICENSE_NUM', 'plate', 'plate number', 'registration'], example: 'LND 123 AB' },
      { key: 'status', label: 'Stage', help: 'Where the claim is: Draft, With the Warranty HOD, With the Manager, Approved to submit, Submitted to the provider, Accepted, Partially accepted or Rejected. A settled or cancelled claim is history and is refused.', aliases: ['stage', 'status', 'claim status', 'state', 'ISTAT'], example: 'Submitted', choices: ['Draft', 'With the Warranty HOD', 'With the Manager', 'Approved to submit', 'Submitted', 'Accepted', 'Partially accepted', 'Rejected'] },
      { key: 'failureDate', label: 'Failure date', help: 'When it failed or was repaired (REPDA), e.g. 21.10.2026.', aliases: ['REPDA', 'failure date', 'date of failure', 'repair date', 'damage date', 'date', 'claim date'], example: '21.10.2026', required: true },
      { key: 'failureReading', label: 'Odometer at failure (km)', help: 'Optional: the reading when it failed.', aliases: ['failure reading', 'odometer at failure', 'odometer', 'mileage', 'km', 'RECDV'], example: '41200' },
      { key: 'complaint', label: 'Complaint', help: 'What the customer reported (the first of the three Cs).', aliases: ['complaint', 'customer complaint', 'symptom', 'concern', 'KTEXT', 'QMTXT', 'description'], example: 'Engine overheats on long trips', required: true },
      { key: 'cause', label: 'Cause', help: 'What was found to cause it.', aliases: ['cause', 'root cause', 'diagnosis', 'finding', 'findings', 'damage'], example: 'Water pump bearing failed' },
      { key: 'correction', label: 'Correction', help: 'What was done to put it right.', aliases: ['correction', 'repair', 'action', 'work done', 'remedy done', 'corrective action'], example: 'Replaced the water pump and coolant' },
      { key: 'causalPart', label: 'Causal part', help: 'The part that failed, in words. Empty: its part number.', aliases: ['causal part', 'failed part', 'part', 'part name', 'component'], example: 'Water pump' },
      { key: 'causalPartNumber', label: 'Causal part number', help: 'Optional: its part number (MATNR).', aliases: ['MATNR', 'causal part number', 'part number', 'part no', 'material'], example: '8-97363-271-0' },
      { key: 'labourAmount', label: 'Labour (₦)', help: 'Optional: labour claimed, in naira.', aliases: ['labour', 'labor', 'labour amount', 'labour claimed'], example: '35000' },
      { key: 'partsAmount', label: 'Parts (₦)', help: 'Optional: parts claimed, in naira.', aliases: ['parts', 'parts amount', 'parts claimed', 'material amount'], example: '128500' },
      { key: 'otherAmount', label: 'Other (₦)', help: 'Optional: anything else claimed (sublet, consumables).', aliases: ['other', 'other amount', 'sublet', 'consumables'], example: '0' },
      { key: 'logisticsAmount', label: 'Logistics (₦)', help: 'Optional: freight for the replacement and the failed part’s return.', aliases: ['logistics', 'freight', 'courier', 'shipping'], example: '0' },
      { key: 'claimedAmount', label: 'Claimed total (₦)', help: 'Optional: the total claimed. Empty: labour + parts + other + logistics.', aliases: ['claimed', 'claimed amount', 'claim amount', 'total', 'total claimed', 'amount'], example: '163500' },
      { key: 'approvedAmount', label: 'Accepted amount (₦)', help: 'For an accepted or partially accepted claim: what the provider accepted.', aliases: ['approved amount', 'accepted amount', 'accepted', 'credited', 'credit amount', 'approved'], example: '150000' },
      { key: 'providerReference', label: 'Provider reference', help: 'For a claim with the provider: the provider’s own claim reference.', aliases: ['provider reference', 'provider claim number', 'manufacturer reference', 'external reference', 'REFNO'], example: 'ISZ-WTY-55102' },
      { key: 'submittedOn', label: 'Submitted on', help: 'Optional: when it went to the provider. Empty: the failure date.', aliases: ['submitted on', 'submission date', 'date submitted', 'sent on'], example: '24.10.2026' },
      { key: 'decidedOn', label: 'Decided on', help: 'Optional: when the provider accepted or rejected it. Empty: the submission date.', aliases: ['decided on', 'decision date', 'date decided', 'accepted on', 'rejected on'], example: '30.10.2026' },
      { key: 'remedy', label: 'Remedy', help: 'Optional: Reimbursement, Replacement or Repair. Empty: the policy’s usual remedy.', aliases: ['remedy', 'settlement type', 'resolution type'], example: 'Reimbursement', choices: ['Reimbursement', 'Replacement', 'Repair'] },
      { key: 'partReturnRequired', label: 'Failed part to return', help: 'Optional: Yes when the provider wants the failed part back (Sent and Received are understood too). Empty: when the provider has a part-retention rule.', aliases: ['part return', 'failed part return', 'return part', 'part return required', 'return required'], example: 'Yes', choices: ['Yes', 'No', 'Sent', 'Received'] },
      { key: 'decisionNotes', label: 'Notes', help: 'Optional: the provider’s reasons, or anything to keep with the claim.', aliases: ['notes', 'decision notes', 'remarks', 'comments', 'rejection reason', 'reason'], example: '' },
    ],
  },
  plantShipments: {
    key: 'plantShipments',
    label: 'Plant shipments',
    noun: 'shipment',
    plural: 'plant shipments',
    description: 'The kit shipments already at the assembly plant when it starts using EJO: supplier, bill of lading, vessel, containers, arrival, SAP purchase order and inbound delivery. Each becomes an EJO shipment (SHP number), its old reference kept; its kits come in with the kits file.',
    needs: 'plant.kit.release',
    approver: 'the Plant Manager',
    branch: true,
    branchArea: 'plant',
    matchOrder: ['shipment reference'],
    fields: [
      { key: 'shipmentRef', label: 'Shipment ref', help: 'The shipment’s own reference in SAP or the plant’s register (kept; the kits file names it).', aliases: ['shipment ref', 'shipment reference', 'shipment', 'shipment no', 'shipment number', 'reference'], example: 'SHP1', required: true },
      { key: 'supplier', label: 'Supplier', help: 'Who shipped the kits.', aliases: ['supplier', 'shipper', 'vendor', 'LIFNR', 'NAME1'], example: 'Isuzu Motors Ltd', required: true },
      { key: 'origin', label: 'Origin', help: 'Optional: the port or country it came from.', aliases: ['origin', 'from', 'port of loading', 'country'], example: 'Yokohama, Japan' },
      { key: 'billOfLading', label: 'Bill of lading', help: 'Optional: the B/L number (unique: the same B/L twice is the same shipment).', aliases: ['bill of lading', 'b/l', 'bl', 'bol', 'bl number'], example: 'MAEU620300000' },
      { key: 'vessel', label: 'Vessel', help: 'Optional.', aliases: ['vessel', 'ship', 'vessel name'], example: 'MV Hoegh Trident' },
      { key: 'containers', label: 'Containers', help: 'Optional: container numbers, separated by ";".', aliases: ['containers', 'container', 'container numbers'], example: 'MSKU41000000; MSKU41000111' },
      { key: 'arrivedAt', label: 'Arrived', help: 'When it arrived at the plant, e.g. 15.09.2026 or 2026-09-15 08:30.', aliases: ['arrived', 'arrival', 'arrival date', 'date arrived', 'received', 'date'], example: '2026-09-15 08:30', required: true },
      { key: 'sapPurchaseOrder', label: 'SAP purchase order', help: 'Optional (EBELN).', aliases: ['EBELN', 'purchase order', 'po', 'po number'], example: '4500018200' },
      { key: 'sapInboundDelivery', label: 'SAP inbound delivery', help: 'Optional (VBELN).', aliases: ['VBELN', 'inbound delivery', 'delivery'], example: '0180004410' },
      { key: 'notes', label: 'Notes', help: 'Optional.', aliases: ['notes', 'remarks', 'comments'], example: '' },
      { key: 'branch', label: 'Branch', help: 'Optional: the assembly plant (or its SAP plant, WERKS). When given it must be the plant chosen for this import.', aliases: ['branch', 'plant', 'branch name', 'WERKS', 'location'], example: 'Assembly Plant' },
    ],
  },
  plantVehicles: {
    key: 'plantVehicles',
    label: 'Plant vehicles (in the plant at the cut-over)',
    noun: 'plant vehicle',
    plural: 'plant vehicles',
    description: 'The vehicles already being built, audited or waiting for PDI or in the yard when the plant starts using EJO: VIN, model, engine number, colour, SAP material, production order and equipment, and the stage they are at. On the line, each takes the plant’s route with the stations before its current one done before EJO; past the gate, the gate is recorded as passed before EJO. Sold vehicles are the workshop’s (the vehicles import), not the plant’s.',
    needs: 'plant.kit.release',
    approver: 'the Plant Manager',
    branch: true,
    branchArea: 'plant',
    matchOrder: ['chassis number'],
    fields: [
      { key: 'vin', label: 'Chassis number (VIN)', help: 'The vehicle’s 17-character VIN (VHVIN).', aliases: ['VIN', 'VHVIN', 'chassis', 'chassis number', 'frame number'], example: 'JAANLR85EL7230001', required: true },
      { key: 'make', label: 'Make', help: 'Optional: worked out from the model.', aliases: ['make', 'brand', 'manufacturer'], example: 'Isuzu' },
      { key: 'modelCode', label: 'Model', help: 'The model the plant builds: NQR, NPR, QLR, QMR or S07.', aliases: ['model', 'model code', 'variant'], example: 'NQR', required: true },
      { key: 'modelName', label: 'Model name', help: 'Optional: the model as written in full.', aliases: ['model name', 'description', 'MAKTX'], example: 'Isuzu NQR (medium truck)' },
      { key: 'engineNumber', label: 'Engine number', help: 'Optional.', aliases: ['engine number', 'engine no', 'engine'], example: '4HK1-640003' },
      { key: 'colour', label: 'Colour', help: 'Optional.', aliases: ['colour', 'color', 'paint'], example: 'Sapphire Blue' },
      { key: 'modelYear', label: 'Model year', help: 'Optional.', aliases: ['model year', 'year', 'my'], example: '2026' },
      { key: 'stage', label: 'Stage', help: 'Where it is: On the line (LINE), Quality audit (QA), Waiting for PDI (PDI) or In the yard (YARD). A kit not yet released is in the kits file; a sold vehicle is the workshop’s.', aliases: ['stage', 'status', 'where'], example: 'LINE', required: true, choices: ['LINE', 'QA', 'PDI', 'YARD'] },
      { key: 'currentStation', label: 'Current station', help: 'On the line: the station it is at, by its code on the route (e.g. W1, E1, G1). Empty: the first.', aliases: ['current station', 'station', 'at station'], example: 'W1' },
      { key: 'lineStartedAt', label: 'Line started', help: 'When the build started, e.g. 2026-09-21 07:30.', aliases: ['line started', 'build started', 'started', 'start'], example: '2026-09-21 07:30' },
      { key: 'gatePassedAt', label: 'Gate passed', help: 'Past the line: when it passed the final quality gate.', aliases: ['gate passed', 'gate', 'passed gate', 'qc passed'], example: '2026-09-21 16:29' },
      { key: 'sapMaterial', label: 'SAP material', help: 'Optional (MATNR).', aliases: ['MATNR', 'material', 'sap material'], example: 'ISZ-NQR75L-CKD' },
      { key: 'sapProductionOrder', label: 'SAP production order', help: 'Optional (AUFNR).', aliases: ['AUFNR', 'production order', 'order'], example: '000001000421' },
      { key: 'sapEquipment', label: 'SAP equipment', help: 'Optional (EQUNR).', aliases: ['EQUNR', 'equipment', 'equipment number'], example: '100000030001' },
      { key: 'branch', label: 'Branch', help: 'Optional: the assembly plant (or its SAP plant, WERKS). When given it must be the plant chosen for this import.', aliases: ['branch', 'plant', 'branch name', 'WERKS', 'location'], example: 'Assembly Plant' },
    ],
  },
  plantKits: {
    key: 'plantKits',
    label: 'Plant kits (packing lists)',
    noun: 'kit',
    plural: 'plant kits',
    description: 'The kits of the shipments already at the plant, as on the packing lists: VIN, engine number, model, lot, cases, and where each stands — arrived, being inspected, waiting for release, on hold, released (with its vehicle in the plant) or rejected. Each takes its model’s arrival checklist; one decided before EJO has its checks recorded as done before EJO.',
    needs: 'plant.kit.release',
    approver: 'the Plant Manager',
    branch: true,
    branchArea: 'plant',
    matchOrder: ['chassis number'],
    after: 'plantShipments',
    fields: [
      { key: 'shipmentRef', label: 'Shipment ref', help: 'The shipment it came on: its reference in the shipments file, or its EJO SHP number.', aliases: ['shipment ref', 'shipment reference', 'shipment', 'shipment no'], example: 'SHP1', required: true },
      { key: 'vin', label: 'Chassis number (VIN)', help: 'The kit’s frame number on the packing list.', aliases: ['VIN', 'VHVIN', 'frame number', 'chassis', 'chassis number'], example: 'JAANLR85EL7230001', required: true },
      { key: 'engineNumber', label: 'Engine number', help: 'Optional.', aliases: ['engine number', 'engine no', 'engine'], example: '4HK1-640003' },
      { key: 'modelCode', label: 'Model', help: 'NQR, NPR, QLR, QMR or S07.', aliases: ['model', 'model code'], example: 'NQR', required: true },
      { key: 'lotNumber', label: 'Lot', help: 'Optional: the lot on the case markings.', aliases: ['lot', 'lot number', 'lot no'], example: 'LOT-2601-01' },
      { key: 'kitType', label: 'Kit type', help: 'CKD or SKD. Empty: the model’s usual.', aliases: ['kit type', 'type', 'ckd/skd'], example: 'CKD', choices: ['CKD', 'SKD'] },
      { key: 'casesExpected', label: 'Cases expected', help: 'Optional: as on the packing list.', aliases: ['cases expected', 'cases', 'case count', 'expected cases'], example: '14' },
      { key: 'casesReceived', label: 'Cases received', help: 'Optional: as counted.', aliases: ['cases received', 'received cases', 'cases counted'], example: '14' },
      { key: 'status', label: 'Status', help: 'Arrived (the default), Inspecting, Submitted (waiting for release), On hold, Released or Rejected.', aliases: ['status', 'stage', 'state'], example: 'RELEASED', choices: ['ARRIVED', 'INSPECTING', 'SUBMITTED', 'ON_HOLD', 'RELEASED', 'REJECTED'] },
      { key: 'inspector', label: 'Inspector', help: 'Optional: who checked it, by employee ID (or name).', aliases: ['inspector', 'checked by', 'inspected by'], example: 'EMP-0101' },
      { key: 'startedAt', label: 'Started', help: 'Optional: when the check started.', aliases: ['started', 'check started', 'inspection started'], example: '2026-09-16 07:31' },
      { key: 'submittedAt', label: 'Submitted', help: 'Optional: when the check was finished and sent for release.', aliases: ['submitted', 'finished', 'check finished'], example: '2026-09-16 10:12' },
      { key: 'decidedBy', label: 'Decided by', help: 'Optional: who released, held or rejected it, by employee ID (or name).', aliases: ['decided by', 'released by', 'approved by'], example: 'EMP-0008' },
      { key: 'decidedAt', label: 'Decided', help: 'Optional: when.', aliases: ['decided', 'decided on', 'released on', 'decision date'], example: '2026-09-16 11:44' },
      { key: 'sapUsageDecision', label: 'Usage decision', help: 'Optional: SAP’s usage decision (A accepted, R rejected).', aliases: ['usage decision', 'ud', 'VCODE'], example: 'A' },
      { key: 'releasedWithShortages', label: 'Released with shortages', help: 'Optional: Yes when released with shortages still open.', aliases: ['released with shortages', 'with shortages', 'concession'], example: 'No', choices: ['Yes', 'No'] },
      { key: 'sapInspectionLot', label: 'SAP inspection lot', help: 'Optional (PRUEFLOS).', aliases: ['PRUEFLOS', 'inspection lot'], example: '010000000013' },
      { key: 'sapMaterialDocument', label: 'SAP material document', help: 'Optional (MBLNR).', aliases: ['MBLNR', 'material document', 'goods receipt'], example: '5000221001' },
      { key: 'decisionNote', label: 'Decision note', help: 'Optional: the reason for a hold, a rejection or a concession.', aliases: ['decision note', 'note', 'notes', 'reason'], example: '' },
      { key: 'branch', label: 'Branch', help: 'Optional: the assembly plant (or its SAP plant, WERKS). When given it must be the plant chosen for this import.', aliases: ['branch', 'plant', 'branch name', 'WERKS', 'location'], example: 'Assembly Plant' },
    ],
  },
  plantKitIssues: {
    key: 'plantKitIssues',
    label: 'Plant kit issues (shortages and damage)',
    noun: 'kit issue',
    plural: 'plant kit issues',
    description: 'The shortages, damage, wrong parts and excess raised against the kits before EJO, open, claimed from the supplier or resolved: each comes onto its kit as it stood, so the line knows what is still missing.',
    needs: 'plant.kit.release',
    approver: 'the Plant Manager',
    branch: true,
    branchArea: 'plant',
    matchOrder: ['kit, kind, part and case'],
    after: 'plantKits',
    fields: [
      { key: 'kitVin', label: 'Kit VIN', help: 'The kit it is raised against, by its VIN (the kit must be in EJO: load the kits file first).', aliases: ['kit vin', 'vin', 'kit', 'chassis number', 'frame number'], example: 'JAANLR85EL7230004', required: true },
      { key: 'kind', label: 'Kind', help: 'Shortage, Damage, Wrong part or Excess.', aliases: ['kind', 'type', 'issue', 'issue type'], example: 'SHORTAGE', required: true, choices: ['SHORTAGE', 'DAMAGE', 'WRONG_PART', 'EXCESS'] },
      { key: 'partNumber', label: 'Part number', help: 'Optional.', aliases: ['part number', 'part no', 'MATNR', 'part'], example: '8-98156-321-0' },
      { key: 'description', label: 'Description', help: 'What is wrong.', aliases: ['description', 'what', 'details', 'problem'], example: 'Door glass regulator, right not in the case', required: true },
      { key: 'caseNumber', label: 'Case', help: 'Optional: the case number.', aliases: ['case', 'case number', 'case no', 'box'], example: 'C09' },
      { key: 'quantity', label: 'Quantity', help: 'Optional: 1 when empty.', aliases: ['quantity', 'qty', 'count'], example: '1' },
      { key: 'stopsLine', label: 'Stops the line', help: 'Yes when the vehicle cannot be built without it.', aliases: ['stops the line', 'stops line', 'line stopper', 'critical'], example: 'Yes', choices: ['Yes', 'No'] },
      { key: 'status', label: 'Status', help: 'Open (the default), Claimed (from the supplier) or Resolved.', aliases: ['status', 'state'], example: 'CLAIMED', choices: ['OPEN', 'CLAIMED', 'RESOLVED'] },
      { key: 'claimReference', label: 'Claim reference', help: 'Optional: the supplier claim’s reference.', aliases: ['claim reference', 'claim', 'claim no', 'claim number'], example: 'Q2-300124' },
      { key: 'resolution', label: 'Resolution', help: 'For a resolved issue: how it was put right.', aliases: ['resolution', 'resolved how', 'outcome'], example: 'Arrived by air freight' },
      { key: 'raisedBy', label: 'Raised by', help: 'Optional: who raised it, by employee ID (or name). Empty: the person who runs the import.', aliases: ['raised by', 'reported by', 'inspector'], example: 'EMP-0101' },
      { key: 'raisedAt', label: 'Raised', help: 'Optional: when.', aliases: ['raised', 'raised on', 'date', 'reported'], example: '2026-09-16 13:44' },
      { key: 'branch', label: 'Branch', help: 'Optional: the assembly plant (or its SAP plant, WERKS). When given it must be the plant chosen for this import.', aliases: ['branch', 'plant', 'branch name', 'WERKS', 'location'], example: 'Assembly Plant' },
    ],
  },
  registers: {
    key: 'registers',
    label: 'Production, QC and PDI registers',
    noun: 'register entry',
    plural: 'register entries',
    description: 'The plant’s existing Excel registers — production line, quality checks and pre-delivery inspections — one row per vehicle per check: VIN, model, date, result, inspector. Shown as read-only history on each vehicle.',
    needs: 'workshop.close.approve',
    approver: 'a Workshop manager or an administrator',
    history: true,
    matchOrder: ['register, chassis number, date and stage'],
    fields: [
      { key: 'vin', label: 'Chassis number (VIN)', help: 'The vehicle’s 17-character VIN.', aliases: ['VIN', 'VHVIN', 'chassis', 'chassis number', 'chassis no', 'frame number', 'vehicle'], example: 'JAANLR85EL7100001', required: true },
      { key: 'kind', label: 'Register', help: 'Production, QC or PDI. Leave the column out when the whole file is one register: choose it when importing.', aliases: ['register', 'kind', 'check type', 'inspection type', 'type', 'process'], example: 'PDI', choices: ['Production', 'QC', 'PDI'] },
      { key: 'eventDate', label: 'Date', help: 'When the check was done, e.g. 14.03.2024.', aliases: ['date', 'check date', 'inspection date', 'production date', 'pdi date', 'build date', 'date checked', 'date inspected'], example: '14.03.2024', required: true },
      { key: 'model', label: 'Model', help: 'Optional, e.g. NQR, NPR, QLR, QMR, S07.', aliases: ['model', 'vehicle model', 'model name', 'variant'], example: 'NQR' },
      { key: 'stage', label: 'Station / step', help: 'Optional: the line station, QC gate or PDI step, e.g. "Trim 2", "Final inspection", "Road test".', aliases: ['station', 'stage', 'step', 'gate', 'checkpoint', 'operation', 'line station', 'area'], example: 'Final inspection' },
      { key: 'result', label: 'Result', help: 'Pass, Fail or Rework (OK / NG are understood).', aliases: ['result', 'status', 'outcome', 'pass/fail', 'pass fail', 'ok/ng', 'decision'], example: 'Pass', choices: ['Pass', 'Fail', 'Rework'] },
      { key: 'inspector', label: 'Inspector', help: 'Optional: who did the check. Seen by staff only, never by customers.', aliases: ['inspector', 'inspected by', 'checked by', 'qc inspector', 'technician', 'operator', 'signed by'], example: 'A. Bello' },
      { key: 'reference', label: 'Reference', help: 'Optional: the register’s own number (sheet, report or job number).', aliases: ['reference', 'ref', 'report number', 'report no', 'sheet number', 'job number', 'document number'], example: 'PDI-2024-0311' },
      { key: 'notes', label: 'Notes', help: 'Optional: defects found, remarks.', aliases: ['notes', 'remarks', 'comments', 'defects', 'findings', 'observation'], example: 'Door seal replaced before release' },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

/**
 * The module each kind of record loads into, for the editions that switch it
 * off (lib/modules.ts): the Store's suppliers, parts and opening stock,
 * Warranty's warranties and claims, and the assembly plant's shipments,
 * vehicles, kits, kit issues and registers. Kinds not listed are always on.
 * Nothing is removed: imports already made stay readable and undoable.
 */
const ENTITY_MODULE: Partial<Record<EntityKey, string>> = {
  suppliers: 'inventory', parts: 'inventory', stock: 'inventory',
  warranties: 'warranty', claims: 'warranty',
  plantShipments: 'plant', plantVehicles: 'plant', plantKits: 'plant', plantKitIssues: 'plant', registers: 'plant',
};

/** Whether a kind of record can be imported in this edition (its module is switched on). */
export function entityInEdition(k: EntityKey, isOn: (key: string) => boolean = moduleIsOn): boolean {
  const m = ENTITY_MODULE[k];
  return !m || isOn(m);
}

/** The kinds of record offered for import in this edition, in the order above. */
export const EDITION_ENTITY_KEYS: EntityKey[] = ENTITY_KEYS.filter((k) => entityInEdition(k));

/** The fields offered in templates and on the column matching: without the SAP link (lib/modules.ts), not the SAP-only ones. */
export function fieldsInEdition(entity: EntityKey, sap: boolean = featureOn('sap')): FieldDef[] {
  return ENTITIES[entity].fields.filter((f) => sap || !f.sapOnly);
}

/** An SAP field name (KUNNR, SMTP_ADDR…) or a name that says SAP: recognised, but not listed while the SAP link is off. */
const SAP_NAME = /^(?!VIN$|MAKE$|MODEL$)[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$|\bSAP\b/;

/** The other column names a field is recognised by, as the template lists them: without the SAP link, not SAP's. */
export function aliasesInEdition(f: FieldDef, sap: boolean = featureOn('sap')): string[] {
  return sap ? f.aliases : f.aliases.filter((a) => !SAP_NAME.test(a));
}

/** Where an import's file came from, in words: "SAP" only while this edition links with SAP. */
export function sourceWords(sourceSystem: string, sap: boolean = featureOn('sap')): string {
  return sap && sourceSystem === 'SAP' ? 'SAP' : sap ? 'an old system or spreadsheet' : 'Zoho, an old system or a spreadsheet';
}

/** SAP's unit codes (ISO and German) → the words the Store uses. Anything else is kept as written. */
const SAP_UNITS: Record<string, string> = {
  ST: 'Piece', PC: 'Piece', PCE: 'Piece', EA: 'Each', EACH: 'Each', PCS: 'Piece', NOS: 'Piece', NO: 'Piece',
  L: 'Litre', LTR: 'Litre', LT: 'Litre', ML: 'Millilitre', KG: 'Kilogram', G: 'Gram', M: 'Metre', MTR: 'Metre', CM: 'Centimetre', MM: 'Millimetre',
  SET: 'Set', ST2: 'Set', PAA: 'Pair', PR: 'Pair', PAIR: 'Pair', CAR: 'Carton', CTN: 'Carton', CT: 'Carton', BOX: 'Box', BX: 'Box', DR: 'Drum', DRM: 'Drum',
  KIT: 'Kit', ROL: 'Roll', RL: 'Roll', PAK: 'Pack', PAC: 'Pack', PK: 'Pack', CAN: 'Can', BOT: 'Bottle', BT: 'Bottle', TUB: 'Tube', GAL: 'Gallon',
};
export function unitWord(raw: string): string {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  return SAP_UNITS[v.toUpperCase()] ?? v.replace(/^./, (c) => c.toUpperCase());
}

export function isEntityKey(x: unknown): x is EntityKey {
  return typeof x === 'string' && x in ENTITIES;
}

/** "Customer No.", "customer_no", "CUSTOMER-NO" → "customerno". */
export function headerKey(h: string): string {
  return String(h ?? '').toLowerCase().replace(/[\s._\-/\\()#:]+/g, '').replace(/[^a-z0-9]/g, '');
}

export type Mapping = Record<string, number | null>;

/**
 * Which column feeds which field, from the headers alone: an exact field key
 * or label first, then any alias. Each column is used once (first match
 * wins, in the field order above), so "phone" goes to the main phone and
 * not also to the second phone.
 */
export function autoMap(entity: EntityKey, headers: string[]): Mapping {
  const keys = headers.map(headerKey);
  const used = new Set<number>();
  const out: Mapping = {};
  for (const f of ENTITIES[entity].fields) {
    const wanted = [f.key, f.label, ...f.aliases].map(headerKey);
    let idx: number | null = null;
    for (const w of wanted) {
      const i = keys.findIndex((k, j) => k === w && !used.has(j));
      if (i >= 0) { idx = i; break; }
    }
    if (idx !== null) used.add(idx);
    out[f.key] = idx;
  }
  return out;
}

/** A saved profile maps by header NAME; turn it into column positions for this file's headers. */
export function mappingFromProfile(entity: EntityKey, profile: Record<string, string>, headers: string[]): Mapping {
  const keys = headers.map(headerKey);
  const out: Mapping = {};
  for (const f of ENTITIES[entity].fields) {
    const name = profile[f.key];
    const i = name ? keys.indexOf(headerKey(name)) : -1;
    out[f.key] = i >= 0 ? i : null;
  }
  return out;
}

/** The mapping as header names, for saving as a profile. */
export function profileFromMapping(mapping: Mapping, headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, i] of Object.entries(mapping)) if (typeof i === 'number' && headers[i] !== undefined) out[k] = headers[i]!;
  return out;
}

/** A mapping sent from the browser, checked: known fields only, each pointing at a real column, each column used once. */
export function cleanMapping(entity: EntityKey, raw: unknown, columnCount: number): Mapping {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Mapping = {};
  const used = new Set<number>();
  for (const f of ENTITIES[entity].fields) {
    const v = src[f.key];
    const i = typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN;
    if (Number.isInteger(i) && i >= 0 && i < columnCount && !used.has(i)) { out[f.key] = i; used.add(i); } else out[f.key] = null;
  }
  return out;
}

/** What is missing before checking can start (a required field, or no way to find a vehicle's customer). */
export function mappingProblems(entity: EntityKey, mapping: Mapping): string[] {
  const out: string[] = [];
  // A name from first and last name (Zoho, staff lists), or a company's name alone, stands in for the name column.
  const nameFromParts = (entity === 'customers' || entity === 'staff') && (mapping.firstName != null || mapping.lastName != null || (entity === 'customers' && mapping.companyName != null));
  for (const f of ENTITIES[entity].fields) if (f.required && mapping[f.key] == null && !(f.key === 'fullName' && nameFromParts)) out.push(`Choose the column for “${f.label}”.`);
  if (entity === 'stock' && mapping.totalValue == null && mapping.unitCost == null) out.push('Choose the column for the stock value or the unit cost: stock is valued at what it cost.');
  if (entity === 'invoices' && mapping.customerExternalId == null && mapping.customerPhone == null && mapping.customerName == null) out.push('Choose how to find each invoice’s customer: their customer number, phone or name.');
  if (entity === 'openJobs' && mapping.vin == null && mapping.plateNumber == null) out.push('Choose the column for the vehicle’s chassis number (VIN) or plate: an open job card is on a vehicle.');
  if (entity === 'openServices' && mapping.vin == null && mapping.plateNumber == null) out.push('Choose the column for the vehicle’s chassis number (VIN) or plate: a service or a booking is for a vehicle.');
  if (entity === 'warranties' && mapping.vin == null && mapping.plateNumber == null && mapping.partNumber == null) out.push('Choose the column for the vehicle’s chassis number (VIN) or plate, or the part number: a warranty covers a vehicle or a part.');
  if (entity === 'claims' && mapping.warrantyNumber == null && mapping.vin == null && mapping.plateNumber == null) out.push('Choose how to find each claim’s warranty: its warranty number, or the vehicle’s chassis number or plate.');
  if (entity === 'jobs' && mapping.customerExternalId == null && mapping.customerPhone == null && mapping.customerEmail == null && mapping.vin == null && mapping.plateNumber == null) out.push('Choose how to find each job’s customer: their customer number, phone or email — or the vehicle’s chassis number or plate.');
  if (entity === 'vehicles') {
    if (mapping.customerExternalId == null && mapping.customerEmail == null && mapping.customerPhone == null) out.push('Choose how to find each vehicle’s customer: their customer number, email or phone.');
    if (mapping.chassisNumber == null && mapping.plateNumber == null) out.push('Choose the column for the chassis number (VIN) or the plate.');
  }
  return out;
}
