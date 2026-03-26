import { LightningElement, api, track } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import VERIFICATION_INFORMATION_OBJECT from '@salesforce/schema/UST_EPLUS__Verification_Information__c';
import CSR_INTERACTION_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__CSR_Interaction__c';
import CALLER_NAME_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__Caller_Name__c';
import MEMBER_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__Member__c';
import CASE_ORIGIN_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__Case_Origin__c';
import CALLER_RELATIONSHIP_TO_MEMBER_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__CallerRelationshiptoMember__c';
import CALLER_PHONE_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__CallerPhoneNumber__c';

export default class MemberVerificationModal extends LightningElement {
    @api account; // The data block containing the account recordId.
    @api interactionId;
    @api interactionName;
    @api callerANI = '';
    @track checkedValues = [];
    masterAccountId = '';
    showDropdowns = true;
    showVerificationSection = false;
    caseOriginValue = 'Inbound - Phone Call';
    memberTypeValue = '';
    representativeTypeValue = '';
    relationshipTypeValue = '';
    showRepresentativeDetails = false;
    showRelationshipType = false;
    nameValue = '';
    callerPhoneValue = '';
    descriptionValue = '';
    repNameValue = '';
    repCallerPhoneValue = '';
    endDateValue = '';
    isSaving = false;
    errorMessage = '';

    get caseOriginOptions() {
        return [
            { label: 'Inbound - Phone Call', value: 'Inbound - Phone Call' },
            { label: 'Outbound - Phone Call', value: 'Outbound - Phone Call' },
            { label: 'Chat', value: 'Chat' },
            { label: 'Walk-In', value: 'Walk-In' },
            { label: 'Research', value: 'Research' },
            { label: 'Transfer', value: 'Transfer' },
            { label: 'Email', value: 'Email' },
            { label: 'Fax', value: 'Fax' },
            { label: 'Voice Mail', value: 'Voice Mail' },
            { label: 'Mail', value: 'Mail' },
            { label: 'Meeting – Virtual', value: 'Meeting – Virtual' },
        ];
    }

    get isPhoneOrigin() {
        return this.caseOriginValue === 'Inbound - Phone Call' ||
               this.caseOriginValue === 'Outbound - Phone Call';
    }

    get showCallerInfo() {
        return this.showVerificationSection && this.memberTypeValue === 'Non-Member';
    }

    get showPhaseOneVerify() {
        return this.caseOriginValue && !this.isPhoneOrigin;
    }

    renderedCallback() {
        console.log('Rendered Callback - Interaction ID:', this.interactionId);
        console.log('Rendered Callback - Interaction Name:', this.interactionName);
    }

    get memberTypeOptions() {
        return [
            { label: 'Member', value: 'Member' },
            { label: 'Non-Member', value: 'Non-Member' },
        ];
    }

    get isParentRelationship() {
        return this.relationshipTypeValue === 'Parent';
    }

    get isNonParentPersonalRep() {
        return this.showRelationshipType &&
               this.relationshipTypeValue &&
               this.relationshipTypeValue !== 'Parent';
    }

    get isLegalRepresentative() {
        return this.representativeTypeValue === 'Legal Representative';
    }

    get todayDateString() {
        const today = new Date();
        const m = today.getMonth() + 1;
        const d = today.getDate();
        const y = today.getFullYear();
        return `${m}/${d}/${y}`;
    }

    get isMailingAddressPresent() {
        return !this.fullMailingAddress;
    }

    get phoneTelLink() {
        if (this.account && this.account.Phone) {
            const digits = this.account.Phone.replace(/\D/g, '');
            return digits.length >= 10 ? `tel:+1${digits}` : '#';
        }
        return '#';
    }

    get formattedPhoneNumber() {
        const phone = this.account ? this.account.Phone : null;
        if (phone) {
            const digits = phone.replace(/\D/g, '');
            const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/);
            if (match) {
                return `(${match[1]}) ${match[2]}-${match[3]}`;
            }
            return phone;
        }
        return '';
    }

    get representativeTypeOptions() {
        return [
            { label: 'Legal Representative', value: 'Legal Representative' },
            { label: 'Personal Representative', value: 'Personal Representative' },
        ];
    }

    get fullMailingAddress() {
        const { MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry } = this.account;
        let address = `${MailingStreet}\n${MailingCity}, ${MailingState} ${MailingPostalCode}`;
        if (MailingCountry) {
            address += `\n${MailingCountry}`;
        }
        return address;
    }

    get relationshipTypeOptions() {
        return [
            { label: 'Parent', value: 'Parent' },
            { label: 'Guardian', value: 'Guardian' },
            { label: 'County DHS', value: 'County DHS' },
            { label: 'POA', value: 'POA' },
            { label: 'Advocate', value: 'Advocate' },
            { label: 'Legal Rep', value: 'Legal Rep' },
            { label: 'Other', value: 'Other' },
        ];
    }

    get verifyButtonLabel() {
        return this.isSaving ? 'Saving...' : 'Verify';
    }

    get verificationOptionsWithDisabled() {
        const options = [
            { label: 'Member ID', value: 'MemberID' },
            { label: 'SSN', value: 'ssn' },
            { label: 'Member Name', value: 'Name' },
            { label: 'Date of Birth', value: 'DateOfBirth' },
            { label: 'Phone Number', value: 'Phone' },
            { label: 'Mailing Address', value: 'MailingAddress', isAddress: true },
        ];

        const isAddressComplete = this.account && this.fullMailingAddress;

        return options.map(option => {
            const isDisabled = option.isAddress ? !isAddressComplete : !this.account || !this.account[option.value];
            option.showAsterisk = !isDisabled && ['Name', 'DateOfBirth', 'MailingAddress'].includes(option.value);
            option.cssClass = option.showAsterisk ? 'required-asterisk' : 'asterisk-placeholder';
            return {
                ...option,
                disabled: isDisabled
            };
        });
    }

    get formattedDateOfBirth() {
        if (this.account && this.account.DateOfBirth) {
            const dateParts = this.account.DateOfBirth.match(/(\w+) (\d+), (\d+)/);
            if (dateParts) {
                const months = {
                    January: '1', February: '2', March: '3', April: '4', May: '5', June: '6', July: '7', August: '8', September: '9', October: '10', November: '11', December: '12'
                };
                const month = months[dateParts[1]];
                const day = dateParts[2];
                const year = dateParts[3];
                return `${month}/${day}/${year}`;
            }
        }
        return '';
    }

    connectedCallback() {
        console.log('Account data on connected:', JSON.stringify(this.account));
        console.log('Interaction Name: ', this.interactionName);
        if (this.callerANI && !this.callerPhoneValue) {
            this.callerPhoneValue = this.callerANI;
        }
    }

    handleCaseOriginChange(event) {
        this.caseOriginValue = event.detail.value;
        if (!this.isPhoneOrigin) {
            this.memberTypeValue = '';
            this.showRepresentativeDetails = false;
        }
        this.checkSelectionsAndDisplayVerification();
    }

    handleMemberTypeChange(event) {
        this.memberTypeValue = event.detail.value;
        this.showRepresentativeDetails = this.memberTypeValue === 'Non-Member';
        this.checkSelectionsAndDisplayVerification();
    }

    handleRepresentativeTypeChange(event) {
        this.representativeTypeValue = event.detail.value;
        this.showRelationshipType = this.representativeTypeValue === 'Personal Representative';
        this.relationshipTypeValue = '';
        this.repNameValue = '';
        this.repCallerPhoneValue = '';
        this.descriptionValue = '';
    }

    handleRelationshipTypeChange(event) {
        this.relationshipTypeValue = event.detail.value;
        if (!this.endDateValue) {
            this.endDateValue = new Date().toISOString().split('T')[0];
        }
    }

    handleNameChange(event) {
        this.nameValue = event.target.value;
    }

    handleCallerPhoneChange(event) {
        this.callerPhoneValue = event.target.value;
    }

    handleDescriptionChange(event) {
        this.descriptionValue = event.target.value;
    }

    handleRepNameChange(event) {
        this.repNameValue = event.target.value;
    }

    handleRepCallerPhoneChange(event) {
        this.repCallerPhoneValue = event.target.value;
    }

    handleEndDateChange(event) {
        this.endDateValue = event.target.value;
    }

    checkSelectionsAndDisplayVerification() {
        if (this.caseOriginValue && this.isPhoneOrigin && this.memberTypeValue) {
            this.showDropdowns = false;
            this.showVerificationSection = true;
        }
    }

    handleChange(event) {
        const { name, checked } = event.target;
        if (checked && !this.checkedValues.includes(name)) {
            this.checkedValues = [...this.checkedValues, name];
        } else if (!checked && this.checkedValues.includes(name)) {
            this.checkedValues = this.checkedValues.filter(value => value !== name);
        }
    }

    verifyPhaseOne() {
        const recordId = this.extractRecordId(this.account);
        if (!recordId) {
            this.errorMessage = "Unable to identify the member record.";
            return;
        }
        this.masterAccountId = recordId;
        // D-6 dependency: callerName/callerPhone values depend on COA decision
        const verificationData = {
            interactionId: this.interactionId,
            callerName: '',
            accountId: this.masterAccountId,
            caseOrigin: this.caseOriginValue,
            representativeType: '',
            callerPhone: '',
        };
        this.isSaving = true;
        this.errorMessage = '';
        this.createVerificationRecord(verificationData);
    }

    verify() {
        console.log('Test Account data on verify:', JSON.stringify(this.account));

        const recordId = this.extractRecordId(this.account);
        if (!recordId) {
            console.error('No recordId found in account data.');
            this.errorMessage = "I'm sorry, the member could not be verified.";
            return;
        }
        this.masterAccountId = recordId;

        // Inline validation for all user-editable required fields
        const allValid = [...this.template.querySelectorAll('[data-validate]')]
            .reduce((valid, input) => {
                input.reportValidity();
                return valid && input.checkValidity();
            }, true);

        if (!allValid) {
            return;
        }

        if (this.checkedValues.length < 3) {
            this.errorMessage = "Please select at least three verification items.";
            return;
        }

        const verificationData = {
            interactionId: this.interactionId,
            callerName: this.nameValue,
            accountId: this.masterAccountId,
            caseOrigin: this.caseOriginValue,
            representativeType: this.representativeTypeValue,
            callerPhone: this.callerPhoneValue,
        };
        console.log('Verification Data:', JSON.stringify(verificationData));

        this.isSaving = true;
        this.errorMessage = '';
        this.createVerificationRecord(verificationData);
    }

    extractRecordId(account) {
        if (account && account.recordId) {
            return account.recordId;
        } else {
            for (let key in account) {
                if (account.hasOwnProperty(key) && typeof account[key] === 'object') {
                    let result = this.extractRecordId(account[key]);
                    if (result) {
                        return result;
                    }
                }
            }
        }
        return null;
    }

    createVerificationRecord(data) {
        const fields = {};
        fields[CSR_INTERACTION_FIELD.fieldApiName] = data.interactionId;
        fields[CALLER_NAME_FIELD.fieldApiName] = data.callerName;
        fields[MEMBER_FIELD.fieldApiName] = data.accountId;
        fields[CASE_ORIGIN_FIELD.fieldApiName] = data.caseOrigin;
        fields[CALLER_RELATIONSHIP_TO_MEMBER_FIELD.fieldApiName] = data.representativeType;
        fields[CALLER_PHONE_FIELD.fieldApiName] = data.callerPhone;

        const recordInput = { apiName: VERIFICATION_INFORMATION_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(result => {
                console.log('Verification Information Record Created:', result);
                this.isSaving = false;
                const closeEvent = new CustomEvent('close', {
                    detail: { verificationData: data }
                });
                this.dispatchEvent(closeEvent);
                this.navigateToAccountPage(data.accountId);
            })
            .catch(error => {
                console.error('Error creating verification information record:', error);
                this.isSaving = false;
                this.errorMessage = 'Verification record could not be saved. Please try again.';
            });
    }

    handleGoBack() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    navigateToAccountPage(recordId) {
        // Use window.location.href to navigate
        window.location.href = `/${recordId}`;
    }
}