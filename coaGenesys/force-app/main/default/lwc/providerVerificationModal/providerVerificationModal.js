import { LightningElement, api, track } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import VERIFICATION_INFORMATION_OBJECT from '@salesforce/schema/UST_EPLUS__Verification_Information__c';
import CSR_INTERACTION_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__CSR_Interaction__c';
import PROVIDER_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__Healthcare_Provider__c';
import CASE_ORIGIN_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__Case_Origin__c';
import CALLER_NAME_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__Caller_Name__c';
import CALLER_PHONE_FIELD from '@salesforce/schema/UST_EPLUS__Verification_Information__c.UST_EPLUS__CallerPhoneNumber__c';

export default class ProviderVerificationModal extends LightningElement {
    @api healthcareProvider;
    @api interactionId;
    @api interactionName;
    @api providerId;
    @api callerANI = '';

    @track checkedValues = [];
    caseOriginValue = '';
    isCallingOnBehalf = false;
    callerName = '';
    callerTypeValue = '';
    callerPhoneNumber = '';
    phoneExtension = '';
    isSaving = false;
    errorMessage = '';

    get caseOriginOptions() {
        return [
            { label: 'Inbound - Phone Call', value: 'Inbound - Phone Call' },
            { label: 'Outbound - Phone Call', value: 'Outbound - Phone Call' },
            { label: 'Email', value: 'Email' },
            { label: 'Voice Mail', value: 'Voice Mail' },
            { label: 'Research', value: 'Research' },
            { label: 'Meeting – Virtual', value: 'Meeting – Virtual' },
            { label: 'Meeting – In Person', value: 'Meeting – In Person' }
        ];
    }

    get callerTypeOptions() {
        return [
            { label: 'Billing Office', value: 'Billing Office' },
            { label: 'Provider/Clinical Office', value: 'Provider/Clinical Office' },
            { label: 'Hospital Staff/Facility', value: 'Hospital Staff/Facility' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get isPhoneOrigin() {
        return this.caseOriginValue === 'Inbound - Phone Call' ||
               this.caseOriginValue === 'Outbound - Phone Call';
    }

    get verifyButtonLabel() {
        return this.isSaving ? 'Saving...' : 'Verify';
    }

    get formattedPhoneNumber() {
        const phone = this.healthcareProvider ? this.healthcareProvider.Phone : null;
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

    get isAddressPresent() {
        return this.healthcareProvider.ProviderStreet || this.healthcareProvider.ProviderCity || 
               this.healthcareProvider.ProviderState || this.healthcareProvider.ProviderZip;
    }

    get phoneTelLink() {
        if (this.healthcareProvider && this.healthcareProvider.Phone) {
            const digits = this.healthcareProvider.Phone.replace(/\D/g, '');
            return digits.length >= 10 ? `tel:+1${digits}` : '#';
        }
        return '#';
    }

    get verificationOptionsWithDisabled() {
        const options = [
            { label: 'Provider Name', value: 'Name' },
            { label: 'Provider ID', value: 'ProviderId' },
            { label: 'Provider TIN', value: 'ProviderTIN' },
            { label: 'Provider Contact #', value: 'Phone' },
            { label: 'Provider NPI', value: 'NPI' },
            { label: 'Address', value: 'ProviderAddress', isAddress: true },
        ];

        const addressComponents = ['ProviderStreet', 'ProviderCity', 'ProviderState', 'ProviderZip'];
        const isAddressComplete = addressComponents.every(component => this.healthcareProvider && this.healthcareProvider[component]);

        return options.map(option => {
            const isDataPresent = this.healthcareProvider && this.healthcareProvider[option.value];
            const isRequired = option.value === 'NPI' && isDataPresent;
            option.showAsterisk = isRequired;
            option.cssClass = isRequired ? 'required-asterisk' : 'asterisk-placeholder';
            return {
                ...option,
                disabled: option.isAddress ? !isAddressComplete : !isDataPresent
            };
        });
    }

    connectedCallback() {
        console.log('HealthcareProvider data on connected:', JSON.stringify(this.healthcareProvider));
        console.log('Provider ID from parent:', this.providerId);
        console.log('Interaction Name: ', this.interactionName);
        if (this.callerANI && !this.callerPhoneNumber) {
            this.callerPhoneNumber = this.callerANI;
        }
        this.showVerificationSectionImmediately();
    }

    showVerificationSectionImmediately() {
        if (this.providerId) {
            console.log('Extracted Provider ID:', this.providerId);
        } else {
            console.error('Provider ID is missing.');
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

    handleCaseOriginChange(event) {
        this.caseOriginValue = event.detail.value;
        if (!this.isPhoneOrigin) {
            this.checkedValues = [];
            this.isCallingOnBehalf = false;
            this.errorMessage = '';
        }
    }

    handleIsCallingOnBehalfChange(event) {
        this.isCallingOnBehalf = event.target.checked;
    }

    handleCallerTypeChange(event) {
        this.callerTypeValue = event.detail.value;
    }

    handleInputChange(event) {
        const { name, value } = event.target;
        this[name] = value;
    }

    verify() {
        console.log('HealthcareProvider data on verify:', JSON.stringify(this.healthcareProvider));
        console.log('Provider ID:', this.providerId);
        console.log('Interaction ID:', this.interactionId);
        console.log('Interaction Name:', this.interactionName);
        console.log('Number of checked values:', this.checkedValues.length);

        // Inline validation for all user-editable required fields
        const allValid = [...this.template.querySelectorAll('[data-validate]')]
            .reduce((valid, input) => {
                input.reportValidity();
                return valid && input.checkValidity();
            }, true);

        if (!allValid) {
            return;
        }

        // Phone origins require checkbox minimum
        if (this.isPhoneOrigin && this.checkedValues.length < 2) {
            this.errorMessage = "Please select at least two verification options to proceed.";
            return;
        }

        // D-6 dependency: callerName/callerPhone empty for non-phone (Option A)
        const verificationData = {
            interactionId: this.interactionId,
            providerId: this.providerId,
            caseOrigin: this.caseOriginValue,
            callerName: this.isPhoneOrigin ? this.callerName : '',
            callerPhone: this.isPhoneOrigin ? this.callerPhoneNumber : '',
        };
        console.log('Verification Data:', JSON.stringify(verificationData));

        this.isSaving = true;
        this.errorMessage = '';
        this.createVerificationRecord(verificationData);
    }

    createVerificationRecord(data) {
        const fields = {};
        fields[CSR_INTERACTION_FIELD.fieldApiName] = data.interactionId;
        fields[CALLER_NAME_FIELD.fieldApiName] = data.callerName;
        fields[PROVIDER_FIELD.fieldApiName] = data.providerId;
        fields[CASE_ORIGIN_FIELD.fieldApiName] = data.caseOrigin;
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
                this.navigateToProviderPage(data.providerId);
            })
            .catch(error => {
                console.error('Error creating verification information record:', error);
                this.isSaving = false;
                this.errorMessage = 'Verification record could not be saved. Please try again.';
            });
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    navigateToProviderPage(recordId) {
        if (recordId) {
            console.log('Navigating to Healthcare Provider record:', recordId);
            window.location.href = `/${recordId}`;
        } else {
            console.error('No Healthcare Provider recordId found, unable to navigate.');
        }
    }
}