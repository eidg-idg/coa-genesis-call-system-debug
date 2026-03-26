import { LightningElement, api } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import INTERACTION_OBJECT from '@salesforce/schema/UST_EPLUS__Interaction__c';

export default class VerifyProvider extends LightningElement {
    @api providers = []; // Array of healthcare providers passed from Visualforce
    @api callerANI = '';
    isModalOpen = false;
    selectedProviderId = null;
    interactionRecordId = null;
    interactionName = null;

    // Getter to return providers with formatted phone numbers
    get formattedProviders() {
        return this.providers.map(provider => ({
            ...provider,
            formattedPhone: this.formatPhoneNumber(provider.Phone)
        }));
    }

    formatPhoneNumber(phone) {
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

    handleProviderClick(event) {
        let providerId = event.target.dataset.id || event.currentTarget.dataset.id;
        if (providerId) {
            this.createInteractionRecord(providerId);
        } else {
            console.error('No Provider ID found on button click.');
        }
    }

    createInteractionRecord(providerId) {
        const fields = {};
        const recordInput = { apiName: INTERACTION_OBJECT.objectApiName, fields };

        createRecord(recordInput)
            .then(interaction => {
                this.interactionRecordId = interaction.id;
                this.interactionName = interaction.fields.Name.value;
                console.log('Interaction Name: ', this.interactionName);
                console.log('Interaction Record Created:', interaction);
                this.openModal(providerId);
            })
            .catch(error => {
                console.error('Error creating interaction record:', error);
            });
    }

    openModal(providerId) {
        this.selectedProviderId = providerId;
        this.isModalOpen = true;
        console.log('Modal open:', this.isModalOpen);
        console.log('Selected Provider ID:', this.selectedProviderId);
    }

    handleModalClose() {
        this.isModalOpen = false;
        this.selectedProviderId = null;
        this.interactionRecordId = null;
        this.interactionName = null;
    }

    get selectedProvider() {
        return this.providers.find(provider => provider.recordId === this.selectedProviderId);
    }

    handleProviderVerified(event) {
        this.isModalOpen = false;
        const recordId = event.detail.recordId;
        if (recordId) {
            this.navigateToHealthcareProviderPage(recordId);
        } else {
            console.error('Record ID is not available from the verified event.');
            this.handleVerificationFailure();
        }
    }

    navigateToHealthcareProviderPage(recordId) {
        window.location.href = `/${recordId}`;
    }

    handleVerificationFailure() {
        console.error('Verification failed. Please try again or contact support.');
    }
}