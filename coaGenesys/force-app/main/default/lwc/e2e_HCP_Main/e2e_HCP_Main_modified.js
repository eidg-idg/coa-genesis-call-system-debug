import { LightningElement, api, wire } from 'lwc';
import getRelatedContactFormRecords from '@salesforce/apex/ExportToExcelControllerHCP.getRelatedContactFormRecords';
import SheetJS from '@salesforce/resourceUrl/sheetjs'; 
import { loadScript } from 'lightning/platformResourceLoader';
import { getRecord } from 'lightning/uiRecordApi';

const FIELDS = ['Healthcare_Provider_Form__c.Name', 
                'Healthcare_Provider_Form__c.Account_Name__c', 
                'Healthcare_Provider_Form__c.DBA_Directory_listing_name__c',
                'Healthcare_Provider_Form__c.Fax__c',
                'Healthcare_Provider_Form__c.Phone__c',
                'Healthcare_Provider_Form__c.Contract_Signature_of_Authority__c',
                'Healthcare_Provider_Form__c.Contract_Signature_of_Autority_email__c',
                'Healthcare_Provider_Form__c.Website_Address__c',
                'Healthcare_Provider_Form__c.Provider_Tax_ID__c',
    'Healthcare_Provider_Form__c.Practice_owned_by_a_woman__c',
];

export default class ExportToExcel extends LightningElement {

    @api recordId;
    hcpFormName;
    hcpFormAccountName;
    hcpFormProviderTaxID;
    hcpFormPracticeOwnedByAWoman;

    hcpFormDBAListingName;
    hcpFormFax;
    hcpFormPhone;
    hcpFormContractSignatureOfAuthority;
    hcpFormContractSignatureOfAuthorityEmail;
    hcpFormWebsiteAddress;
    relatedContactFormRecords = [];

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredHCPForm({ error, data }) {
        if (data) {
            this.hcpFormName = data.fields.Name.value;
            this.hcpFormAccountName = data.fields.Account_Name__c.value;
            this.hcpFormDBAListingName = data.fields.DBA_Directory_listing_name__c.value;
            this.hcpFormFax = data.fields.Fax__c.value;
            this.hcpFormPhone = data.fields.Phone__c.value;
            this.hcpFormContractSignatureOfAuthority = data.fields.Contract_Signature_of_Authority__c.value;
            this.hcpFormContractSignatureOfAuthorityEmail = data.fields.Contract_Signature_of_Autority_email__c.value;
            this.hcpFormWebsiteAddress = data.fields.Website_Address__c;
            this.hcpFormProviderTaxID = data.fields.Provider_Tax_ID__c.value;
            this.hcpFormPracticeOwnedByAWoman = data.fields.Practice_owned_by_a_woman__c.value;

        } else if (error) {
            console.error("Error fetching HCP Form data", error);
        }
    }

    @wire(getRelatedContactFormRecords, { hcpFormId: '$recordId' })
    wiredContactForms({ error, data }) {
        if (data) {
            console.log('Contact Form data:', data); 
            this.relatedContactFormRecords = data.map(contact => {
                return [contact.Name, contact.FirstName__c, contact.LastName__c, contact.Email__c];
            });
        } else if (error) {
            console.error("Error fetching contact form data", error);
        }
    }

    async connectedCallback() {
        await loadScript(this, SheetJS); 
        this.version = XLSX.version;
        console.log('version: ' + this.version);
    }

    exportToExcel() {
        const tableData1 = [
            [this.hcpFormName, 
                this.hcpFormAccountName, 
                this.hcpFormDBAListingName, 
                this.hcpFormFax, 
                this.hcpFormPhone,
                this.hcpFormContractSignatureOfAuthority,
                this.hcpFormContractSignatureOfAuthorityEmail,
                this.hcpFormWebsiteAddress,
                this.hcpFormProviderTaxID]
        ];
        
        const tableData2 = this.relatedContactFormRecords;

        const filename = 'ExportToExcel.xlsx';
        const workbook = XLSX.utils.book_new();

        const worksheetData1 = tableData1.map(record => ({
            "Name": record[0],
            "Account Name": record[1],
            "DBA Listing Name": record[2],
            "Fax": record[3],
            "Phone": record[4],
            "Contract Signature of Authority": record[5],
            "Contract Signature of Authority Email": record [6],
            "Website Address": record [7],
            "Provider Tax ID": record[8]
        }));

        // Create Practice Info worksheet
        const practiceInfoData = [["Practice Owned by a Woman", this.hcpFormPracticeOwnedByAWoman]];
        const worksheetPracticeInfo = XLSX.utils.aoa_to_sheet(practiceInfoData);
    
        const worksheet1 = XLSX.utils.json_to_sheet(worksheetData1);
        XLSX.utils.book_append_sheet(workbook, worksheet1, 'APX 1 - A');

        XLSX.utils.book_append_sheet(workbook, worksheetPracticeInfo, 'Practice Info'); // Insert Practice Info worksheet
    

        const worksheetData2 = tableData2.map(record => ({
            "Name": record[0],
            "First Name": record[1],
            "Last Name": record[2],
            "Email": record[3]
        }));
        const worksheet2 = XLSX.utils.json_to_sheet(worksheetData2, {
            header: ["Name", "First Name", "Last Name", "Email"]
        });
        XLSX.utils.book_append_sheet(workbook, worksheet2, 'Contacts');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}