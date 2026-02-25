import { LightningElement, api, track } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import INTERACTION_OBJECT from '@salesforce/schema/UST_EPLUS__Interaction__c';

export default class VerifyMember extends LightningElement {
    @api accounts = [];
    @track isModalOpen = false;
    @track selectedAccountId = null;
    @track interactionRecordId = null;
    @track interactionName = null;
    @track verificationData = {}; // To store temporary verification data

    connectedCallback() {
        console.log('Connected Callback: Checking Accounts Data');
        this.accounts.forEach((account, index) => {
            console.log(`Account ${index}:`, JSON.stringify(account, null, 2));
            console.log(`Account ${index} ID:`, account.recordId);
            console.log(`Address for Account ${index}:`, `${account.MailingStreet}, ${account.PersonMailingCity}, ${account.PersonMailingState}, ${account.PersonMailingPostalCode}, ${account.PersonMailingCountry}`);
            console.log(`Member ID for Account ${index}:`, `${account.MemberID}`);
            console.log(`Last 4 SSN for Account ${index}:`, `${account.Last4SSN}`);
        });
    }

    // Getter to return accounts with formatted phone numbers
    get formattedAccounts() {
        return this.accounts.map(account => {
            return {
                ...account,
                formattedPhone: this.formatPhoneNumber(account.Phone),
                formattedDOB: this.formatDateOfBirth(account.DateOfBirth),
                Last4SSN: account.Last4SSN
            };
        });
    }

    formatPhoneNumber(phone) {
        if (phone) {
            const digits = phone.replace(/\D/g, '');
            const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/);
            if (match) {
                return `${match[1]}-${match[2]}-${match[3]}`;
            }
            return phone;
        }
        return '';
    }

    formatDateOfBirth(dob) {
        if (dob) {
            const date = new Date(dob);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
        }
        return '';
    }

    openModal(accountId) {
        this.selectedAccountId = accountId;
        this.isModalOpen = true;
        console.log('Modal open:', this.isModalOpen);
        console.log('Selected Account ID:', this.selectedAccountId);
    }
    
    handleModalClose(event) {
        this.isModalOpen = false;
        this.selectedAccountId = null;
        this.interactionRecordId = null;
        this.interactionName = null;
        
        if (event.detail && event.detail.verificationData) {
            this.verificationData = event.detail.verificationData;
            console.log('Verification Data:', JSON.stringify(this.verificationData));
            
            // Log the new fields
            console.log('Case Origin:', this.verificationData.caseOrigin);
            console.log('Representative Type:', this.verificationData.representativeType);
            console.log('Caller Phone:', this.verificationData.callerPhone);
        }
    }
    
    handleMemberClick(event) {
        let accountId = event.target.dataset.id || event.currentTarget.dataset.id;
        console.log('Clicked Account ID:', accountId);
    
        if (accountId) {
            this.createInteractionRecord(accountId);
        } else {
            console.error('No Account ID found on button click.');
        }
    }
    
    createInteractionRecord(accountId) {
        const fields = {};
    
        const recordInput = { apiName: INTERACTION_OBJECT.objectApiName, fields };
    
        createRecord(recordInput)
            .then(interaction => {
                this.interactionRecordId = interaction.id;
                this.interactionName = interaction.fields.Name.value;
                console.log('Interaction Name: ', this.interactionName);
                console.log('Interaction Record Created:', interaction);
                this.openModal(accountId);
            })
            .catch(error => {
                console.error('Error creating interaction record:', error);
            });
    }

    // Helper function to find account by ID when needed
    get selectedAccount() {
        return this.accounts.find(account => account.recordId === this.selectedAccountId);
    }

    get formattedPhoneNumber() {
        const account = this.selectedAccount;
        if (account && account.Phone && !account.Phone.includes('-')) {
            return `${account.Phone.slice(0, 3)}-${account.Phone.slice(3, 6)}-${account.Phone.slice(6)}`;
        }
        return account ? account.Phone : '';
    }

    get formattedDateOfBirth() {
        const account = this.selectedAccount;
        if (account && account.DateOfBirth) {
            const dob = new Date(account.DateOfBirth);
            return `${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getDate().toString().padStart(2, '0')}/${dob.getFullYear()}`;
        }
        return '';
    }

    handleMemberVerified(event) {
        console.log('Event CurrentTarget:', event.currentTarget);
        console.log('Dataset:', event.currentTarget.dataset);
    
        const recordId = event.currentTarget.dataset.id;
        console.log('Record ID from handleMemberVerified Method:', recordId);
        if (recordId) {
            this.selectedAccountId = recordId;
            this.isModalOpen = true;
        } else {
            console.error('Record ID is not available from the verified event.');
        }
    }

    navigateToAccountPage(recordId) {
        // Navigate to the Account page using window.location.href
        window.location.href = `/${recordId}`;
    }

    handleVerificationFailure() {
        this.handleModalClose();
    }
}