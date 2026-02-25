import { LightningElement, api, wire } from 'lwc';
import getRelatedContactFormRecords from '@salesforce/apex/ExportToExcelControllerHCP.getRelatedContactFormRecords';
import getRelatedFacilityRecords from '@salesforce/apex/ExportToExcelControllerHCP.getRelatedFacilityRecords';
import getRelatedPractitionerRecords from '@salesforce/apex/ExportToExcelControllerHCP.getRelatedPractitionerRecords';
import getRelatedHealthcareIndividualFormRecords from '@salesforce/apex/ExportToExcelControllerHCP.getRelatedHealthcareIndividualFormRecords';
import getRelatedHealthcareOrganizationFormRecords from '@salesforce/apex/ExportToExcelControllerHCP.getRelatedHealthcareOrganizationFormRecords';
import { loadScript } from 'lightning/platformResourceLoader';
import { getRecord } from 'lightning/uiRecordApi';
import SheetJS from '@salesforce/resourceUrl/sheetjs';


const FIELDS = [
    'Healthcare_Provider_Form__c.Name', 
    'Healthcare_Provider_Form__c.Account_Name__c', 
    'Healthcare_Provider_Form__c.DBA_Directory_listing_name__c',
    'Healthcare_Provider_Form__c.Fax__c',
    'Healthcare_Provider_Form__c.Phone__c',
    'Healthcare_Provider_Form__c.Contract_Signature_of_Authority__c',
    'Healthcare_Provider_Form__c.Contract_Signature_of_Autority_email__c',
    'Healthcare_Provider_Form__c.Website_Address__c',

    //Practice Information Fields
    'Healthcare_Provider_Form__c.Practice_owned_by_a_woman__c',
    'Healthcare_Provider_Form__c.Practice_is_owned_by_a_person_of_color__c',
    'Healthcare_Provider_Form__c.Practice_owner_POC_specification__c',
    'Healthcare_Provider_Form__c.Practice_is_owned_by_a_veteran__c',
    'Healthcare_Provider_Form__c.Practice_owned_by_veteran_diff_abled__c',
    'Healthcare_Provider_Form__c.Practice_owned_by_person_diff_abled__c',
    'Healthcare_Provider_Form__c.Practice_is_100_telehealth__c',
    'Healthcare_Provider_Form__c.Community_Mental_Health_Center_CMHC__c',
    'Healthcare_Provider_Form__c.Substance_Abuse_Disorder_clinic__c',
    'Healthcare_Provider_Form__c.ASAM_Level_s__c', //new field added June 26, 2024
    'Healthcare_Provider_Form__c.Indian_Health_Care_Provider_IHCP__c',
    'Healthcare_Provider_Form__c.Essential_Community_Provider_ECP__c',
    'Healthcare_Provider_Form__c.Comprehensive_Safety_Net_Provider_CSNP__c', //new field added June 25, 2024
    'Healthcare_Provider_Form__c.Essential_Safety_Net_Provider_ESNP__c', //new field added June 25, 2024
    'Healthcare_Provider_Form__c.School_based_Health_Care_Center_SBHC__c',
    'Healthcare_Provider_Form__c.Provides_a_HIPAA_compliant_telehlth_svcs__c',
    'Healthcare_Provider_Form__c.Provides_Amer_Sign_Lang_ASL_services__c',
    'Healthcare_Provider_Form__c.Federally_Qualified_Health_Center_FQHC__c',
    'Healthcare_Provider_Form__c.Rural_Health_Center_RHC__c',
    'Healthcare_Provider_Form__c.Pediatric_only__c',
    'Healthcare_Provider_Form__c.Women_only__c',
    'Healthcare_Provider_Form__c.Adults_only__c',
    'Healthcare_Provider_Form__c.Capable_of_billing_Medicare__c',
    'Healthcare_Provider_Form__c.Capable_of_billing_Medicaid__c',
    'Healthcare_Provider_Form__c.Ages_seen_in_practice__c',

    //Accreditation Fields
    'Healthcare_Provider_Form__c.Accr_Assoc_Ambul_Hlth_Care_AAAHC__c',
    'Healthcare_Provider_Form__c.Year_of_AAAHC_accreditation__c',
    'Healthcare_Provider_Form__c.Jnt_Comm_on_Accr_of_HC_Orgs_JCAHO__c',
    'Healthcare_Provider_Form__c.Year_of_JCAHO_accreditation__c',
    'Healthcare_Provider_Form__c.Nat_l_Comm_for_Quality_Assurance_NCQA__c',
    'Healthcare_Provider_Form__c.Year_of_NCQA_accreditation__c',
    'Healthcare_Provider_Form__c.Utilization_Review_Accr_Comm_URAC__c',
    'Healthcare_Provider_Form__c.Year_of_URAC_accreditation__c',
    'Healthcare_Provider_Form__c.SUD_Accreditations__c', //new field added June 25, 2024

    //Billing Info Fields
    'Healthcare_Provider_Form__c.Make_checks_payable_to__c',
    'Healthcare_Provider_Form__c.Provider_Tax_ID__c',
    'Healthcare_Provider_Form__c.Provider_NPI__c',
    'Healthcare_Provider_Form__c.Organizational_Medicaid__c',
    'Healthcare_Provider_Form__c.Organizational_Medicare_Number__c',
    'Healthcare_Provider_Form__c.Payto_Street_Address__c',
    'Healthcare_Provider_Form__c.Practice_Street_Address__c',
    'Healthcare_Provider_Form__c.County__c',
    'Healthcare_Provider_Form__c.Billing_Format__c',
    'Healthcare_Provider_Form__c.Directory__c',

    //Attestation Fields
    'Healthcare_Provider_Form__c.Signature__c',
    'Healthcare_Provider_Form__c.Title__c',
    'Healthcare_Provider_Form__c.Organization__c',
    'Healthcare_Provider_Form__c.Date__c',

    //Behavioral Specialties Fields
    'Healthcare_Provider_Form__c.Children_12_and_younger__c',
    'Healthcare_Provider_Form__c.Adolescents_13_to_18__c',
    'Healthcare_Provider_Form__c.Adults_19_to_64__c',
    'Healthcare_Provider_Form__c.Seniors_65_and_older__c',
    'Healthcare_Provider_Form__c.Males__c',
    'Healthcare_Provider_Form__c.Females__c',
    'Healthcare_Provider_Form__c.Agression_Replacement_Therapy__c',
    'Healthcare_Provider_Form__c.Animal_assisted__c',
    'Healthcare_Provider_Form__c.Attachment_based_Therapy__c',
    'Healthcare_Provider_Form__c.Art_Therapy__c',
    'Healthcare_Provider_Form__c.Biofeedback__c',
    'Healthcare_Provider_Form__c.Cognitive_Behavioral_Therapy__c',
    'Healthcare_Provider_Form__c.Dialectical_Behavior_Therapy__c',
    'Healthcare_Provider_Form__c.Eye_Mvmnt_Desens_Reproc_Therapy_EMDR__c',
    'Healthcare_Provider_Form__c.Exposure_and_Response_Prevention__c',
    'Healthcare_Provider_Form__c.Mutisystemic_Therapy_MST__c',
    'Healthcare_Provider_Form__c.Psychological_Testing_and_Evaluation__c',
    'Healthcare_Provider_Form__c.Sex_Offndr_Mgmt_Brd_SOMB_Trtmnt_Provdr__c',
    'Healthcare_Provider_Form__c.Adoption__c',
    'Healthcare_Provider_Form__c.AIDS_HIV__c',
    'Healthcare_Provider_Form__c.Alzheimer_s_dementia__c',
    'Healthcare_Provider_Form__c.Anxiety_Panic__c',
    'Healthcare_Provider_Form__c.ADD_ADHD__c',
    'Healthcare_Provider_Form__c.Autism_Spectrum__c',
    'Healthcare_Provider_Form__c.Bipolar_disorder__c',
    'Healthcare_Provider_Form__c.Borderline_Personality_Disorder__c',
    'Healthcare_Provider_Form__c.Brain_Injury_TBI__c',
    'Healthcare_Provider_Form__c.Child_abuse__c',
    'Healthcare_Provider_Form__c.Children_of_alcoholics__c',
    'Healthcare_Provider_Form__c.Chronic_pain_or_illness__c',
    'Healthcare_Provider_Form__c.Compulsive_behaviors__c',
    'Healthcare_Provider_Form__c.Conduct_disorder__c',
    'Healthcare_Provider_Form__c.Criminal_justice__c',
    'Healthcare_Provider_Form__c.Cultural_issues__c',

    'Healthcare_Provider_Form__c.Depression__c',
    'Healthcare_Provider_Form__c.Developmental_disorders__c',
    'Healthcare_Provider_Form__c.Disruptive_behavior_disorders__c',
    'Healthcare_Provider_Form__c.Dissociative_disorders__c',
    'Healthcare_Provider_Form__c.Domestic_violence__c',
    'Healthcare_Provider_Form__c.Eating_disorders__c',
    'Healthcare_Provider_Form__c.Elder_abuse__c',
    'Healthcare_Provider_Form__c.End_of_life__c',
    'Healthcare_Provider_Form__c.Foster_Care__c',
    'Healthcare_Provider_Form__c.Family_therapy__c',
    'Healthcare_Provider_Form__c.Gender_identity_counseling__c',
    'Healthcare_Provider_Form__c.Grief_and_loss__c',
    'Healthcare_Provider_Form__c.Habit_Reversal_Therapy__c',
    'Healthcare_Provider_Form__c.Impulse_control__c',
    'Healthcare_Provider_Form__c.Intellectual_disabilities__c',

    'Healthcare_Provider_Form__c.Intimacy_issues__c',
    'Healthcare_Provider_Form__c.LGBTQ_counseling__c',
    'Healthcare_Provider_Form__c.Learning_disabilities__c',
    'Healthcare_Provider_Form__c.Life_transitions__c',
    'Healthcare_Provider_Form__c.Men_s_issues__c',
    'Healthcare_Provider_Form__c.Mental_Hlth_Certs_designated_by_OBH__c',
    'Healthcare_Provider_Form__c.Mood_disorders__c',
    'Healthcare_Provider_Form__c.Neuropsychiatry__c',
    'Healthcare_Provider_Form__c.Neuropsychology__c',
    'Healthcare_Provider_Form__c.Obesity__c',
    'Healthcare_Provider_Form__c.Obsessive_compulsive_disorders__c',
    'Healthcare_Provider_Form__c.Play_Therapy__c',
    'Healthcare_Provider_Form__c.Parenting_issues__c',
    'Healthcare_Provider_Form__c.Personality_Dissorders__c',
    'Healthcare_Provider_Form__c.Phobias__c',

    'Healthcare_Provider_Form__c.Postpartum__c',
    'Healthcare_Provider_Form__c.Post_traumatic_stress__c',
    'Healthcare_Provider_Form__c.Psychological_illness__c',
    'Healthcare_Provider_Form__c.Psychosis__c',
    'Healthcare_Provider_Form__c.Psychosomatic_illness__c',
    'Healthcare_Provider_Form__c.Queer_Questioning__c',
    'Healthcare_Provider_Form__c.Relationship_issues__c',
    'Healthcare_Provider_Form__c.Relinquishment_counseling__c',
    'Healthcare_Provider_Form__c.Reproductive__c',
    'Healthcare_Provider_Form__c.Schizophrenia__c',
    'Healthcare_Provider_Form__c.Self_harm_self_injury__c',
    'Healthcare_Provider_Form__c.Sexual_harassment__c',
    'Healthcare_Provider_Form__c.Sexual_issues__c',
    'Healthcare_Provider_Form__c.Sexual_Offenders__c',
    'Healthcare_Provider_Form__c.Sleep_insomnia__c',

    'Healthcare_Provider_Form__c.Spiritual_concerns__c',
    'Healthcare_Provider_Form__c.Stress_management__c',
    'Healthcare_Provider_Form__c.Subsance_Use_Disorder__c',
    'Healthcare_Provider_Form__c.Trauma__c',
    'Healthcare_Provider_Form__c.Violent_offenders__c',
    'Healthcare_Provider_Form__c.Women_s_issues__c',
];

export default class ExportToExcel extends LightningElement {
    @api recordId;
    hcpFormName;
    hcpFormAccountName;
    hcpFormPracticeOwnedByAWoman;
    hcpFormDBAListingName;
    hcpFormFax;
    hcpFormPhone;
    hcpFormContractSignatureOfAuthority;
    hcpFormContractSignatureOfAuthorityEmail;
    hcpFormWebsiteAddress;

    //practice information variables
    hcpFormPracticeIsOwnedByAPersonOfColor;
    hcpFormPracticeOwnerPOCSpecification;
    hcpFormPracticeIsOwnedByAVeteran;
    hcpFormPracticeOwnedByVeteranDiffAbled;
    hcpFormPracticeOwnedByPersonDiffAbled;
    hcpFormPracticeIsTelehealth;
    hcpFormCommunityMentalHealthCenterCMHC;
    hcpFormEssentialSafetyNetProviderESNP; //new variable added June 25, 2024
    hcpFormComprehensiveSafetyNetProviderCSNP; //new variable added June 25, 2024
    hcpFormSubstanceAbuseDisorderClinic;
    hcpFormASAMLevels; //new variable added June 26, 2024
    hcpFormIndianHealthCareProviderIHCP;
    hcpFormEssentialCommunityProviderECP;
    hcpFormSchoolBasedHealthCareCenterSBHC;
    hcpFormProvidesHIPAACompliantTelehealthServices;
    hcpFormProvidesAmericanSignLanguageServicesASL;
    hcpFormFederallyQualifiedHealthCenterFQHC;
    hcpFormRuralHealthCenterRHC;
    hcpFormPediatricOnly;
    hcpFormWomenOnly;
    hcpFormAdultsOnly;
    hcpFormCapableOfBillingMedicare;
    hcpFormCapableOfBillingMedicaid;
    hcpFormAgesSeenInPractice;

    //accreditation variables
    hcpFormAccrAAACH;
    hcpFormYearAAACH;
    hcpFormAccrJCAHO;
    hcpFormYearJCAHO;
    hcpFormAccrNCQA;
    hcpFormYearNCQA;
    hcpFormAccrURAC;
    hcpFormYearURAC;
    hcpFormSUD; //new variable added June 25, 2024

    //Billing Info variables
    hcpFormMakeChecksPayable;
    hcpFormProviderTaxID;
    hcpFormProviderNPI;
    hcpFormOrganizationMedicaidID;
    hcpFormOrganizationMedicareNumber;
    hcpFormBillingAddress;
    hcpFormMailingAddress;
    hcpFormCounty;
    hcpFormBillingFormat;
    hcpFormDirectory;

    //attestation variables
    hcpFormSignature;
    hcpFormTitle;
    hcpFormOrganization;
    hcpFormDate;

    //Related Data Arrays
    relatedContactFormRecords = [];
    relatedFacilityRecords = [];
    relatedPractitionerRecords = [];
    relatedHealthcareIndividualFormRecords = [];
    relatedHealthcareOrganizationFormRecords = [];

    //Behavioral Specialties variables
    hcpFormChildren12andYounger;
    hcpFormAdolescents1318;
    hcpFormAdults1964;
    hcpFormSenior65;
    hcpFormMales;
    hcpFormFemales;
    hcpFormAgressionReplacement;
    hcpFormAnimalAssisted;
    hcpFormAttachment;
    hcpFormArt;
    hcpFormBiofeedback;
    hcpFormCognitive;
    hcpFormDialectical;
    hcpFormEMDR;
    hcpFormExposure;
    hcpFormMultisystemic;
    hcpFormPsychologicalTesting;
    hcpFormSexOffender;
    hcpFormAdoption;
    hcpFormAidsHiv;
    hcpFormAlz;
    hcpFormAnxiety;
    hcpFormADDADHD;
    hcpFormAutism;
    hcpFormBipolar;
    hcpFormBorderlinePersonality;
    hcpFormBrainInjury;
    hcpFormChildAbuse;
    hcpFormChildrenOfAlcoholics;
    hcpFormChronicPain;
    hcpFormCompulsiveBehaviors;
    hcpFormConductDisorder;
    hcpFormCriminalJustice;
    hcpFormCulturalIssues;
    hcpFormDepression;
    hcpFormDevelopmentalDisorders;
    hcpFormDisruptive;
    hcpFormDissociative;
    hcpFormDomestic;
    hcpFormEatingDisorders;
    hcpFormElderAbuse;
    hcpFormEndOfLife;
    hcpFormFosterCare;
    hcpFormFamilyTherapy;
    hcpFormGenderIdentity;
    hcpFormGrief;
    hcpFormHabit;
    hcpFormImpulse;
    hcpFormIntellectual;
    hcpFormIntimacy;
    hcpFormLGBTQ;
    hcpFormLearningDisabilities;
    hcpFormLifeTransitions;
    hcpFormMensIssues;
    hcpFormMentalHealthCertsOBH;
    hcpFormMoodDisorders;
    hcpFormNeuropsychiatry;
    hcpFormNeuropsychology;
    hcpFormObesity;
    hcpFormOCD;
    hcpFormPlay;
    hcpFormParentingIssues;
    hcpFormPersonalityDisorders;
    hcpFormPhobias;
    hcpFormPostPartum;
    hcpFormPTSD;
    hcpFormPsychologicalIllness;
    hcpFormPsychosis;
    hcpFormPsychosomatic;
    hcpFormQueer;
    hcpFormRelationshipIssues;
    hcpFormRelinquishmentCounseling;
    hcpFormReproductive;
    hcpFormSchizophrenia;
    hcpFormSelfHarm;
    hcpFormSexualHarassment;
    hcpFormSexualIssues;
    hcpFormSexualOffenders;
    hcpFormSleep;
    hcpFormSpiritual;
    hcpFormStress;
    hcpFormSubstance;
    hcpFormTrauma;
    hcpFormViolentOffenders;
    hcpFormWomensIssues;

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
            this.hcpFormWebsiteAddress = data.fields.Website_Address__c.value;

            //practice information assignments
            this.hcpFormPracticeOwnedByAWoman = data.fields.Practice_owned_by_a_woman__c.value;
            this.hcpFormPracticeIsOwnedByAPersonOfColor = data.fields.Practice_is_owned_by_a_person_of_color__c.value;
            this.hcpFormPracticeOwnerPOCSpecification = data.fields.Practice_owner_POC_specification__c.value;
            this.hcpFormPracticeIsOwnedByAVeteran = data.fields.Practice_is_owned_by_a_veteran__c.value;
            this.hcpFormPracticeOwnedByVeteranDiffAbled = data.fields.Practice_owned_by_veteran_diff_abled__c.value;
            this.hcpFormPracticeOwnedByPersonDiffAbled = data.fields.Practice_owned_by_person_diff_abled__c.value;
            this.hcpFormPracticeIsTelehealth = data.fields.Practice_is_100_telehealth__c.value;
            this.hcpFormEssentialSafetyNetProviderESNP = data.fields.Essential_Safety_Net_Provider_ESNP__c.value; //new binding added June 25, 2024
            this.hcpFormComprehensiveSafetyNetProviderCSNP = data.fields.Comprehensive_Safety_Net_Provider_CSNP__c.value; //new binding added June 25, 2024
            this.hcpFormCommunityMentalHealthCenterCMHC = data.fields.Community_Mental_Health_Center_CMHC__c.value;
            this.hcpFormSubstanceAbuseDisorderClinic = data.fields.Substance_Abuse_Disorder_clinic__c.value;
            this.hcpFormASAMLevels = data.fields.ASAM_Level_s__c.value; //new binding added June 26, 2024
            this.hcpFormIndianHealthCareProviderIHCP = data.fields.Indian_Health_Care_Provider_IHCP__c.value;
            this.hcpFormEssentialCommunityProviderECP = data.fields.Essential_Community_Provider_ECP__c.value;
            this.hcpFormSchoolBasedHealthCareCenterSBHC = data.fields.School_based_Health_Care_Center_SBHC__c.value;
            this.hcpFormProvidesHIPAACompliantTelehealthServices = data.fields.Provides_a_HIPAA_compliant_telehlth_svcs__c.value;
            this.hcpFormProvidesAmericanSignLanguageServicesASL = data.fields.Provides_Amer_Sign_Lang_ASL_services__c.value;
            this.hcpFormFederallyQualifiedHealthCenterFQHC = data.fields.Federally_Qualified_Health_Center_FQHC__c.value;
            this.hcpFormRuralHealthCenterRHC = data.fields.Rural_Health_Center_RHC__c.value;
            this.hcpFormPediatricOnly = data.fields.Pediatric_only__c.value;
            this.hcpFormWomenOnly = data.fields.Women_only__c.value;
            this.hcpFormAdultsOnly = data.fields.Adults_only__c.value;
            this.hcpFormCapableOfBillingMedicare = data.fields.Capable_of_billing_Medicare__c.value;
            this.hcpFormCapableOfBillingMedicaid = data.fields.Capable_of_billing_Medicaid__c.value;
            this.hcpFormAgesSeenInPractice = data.fields.Ages_seen_in_practice__c.value;


            //accreditation data assignments
            this.hcpFormAccrAAACH = data.fields.Accr_Assoc_Ambul_Hlth_Care_AAAHC__c.value;
            this.hcpFormYearAAACH = data.fields.Year_of_AAAHC_accreditation__c.value;
            this.hcpFormAccrJCAHO = data.fields.Jnt_Comm_on_Accr_of_HC_Orgs_JCAHO__c.value;
            this.hcpFormYearJCAHO = data.fields.Year_of_JCAHO_accreditation__c.value;
            this.hcpFormAccrNCQA = data.fields.Nat_l_Comm_for_Quality_Assurance_NCQA__c.value;
            this.hcpFormYearNCQA = data.fields.Year_of_NCQA_accreditation__c.value;
            this.hcpFormAccrURAC = data.fields.Utilization_Review_Accr_Comm_URAC__c.value;
            this.hcpFormYearURAC = data.fields.Year_of_URAC_accreditation__c.value;
            this.hcpFormSUD = data.fields.SUD_Accreditations__c.value; //new binding added June 25, 2024


            //billing information assignments
            this.hcpFormMakeChecksPayable = data.fields.Make_checks_payable_to__c.value;
            this.hcpFormProviderTaxID = data.fields.Provider_Tax_ID__c.value;
            this.hcpFormProviderNPI = data.fields.Provider_NPI__c.value;
            this.hcpFormOrganizationMedicaidID = data.fields.Organizational_Medicaid__c.value;
            this.hcpFormOrganizationMedicareNumber = data.fields.Organizational_Medicare_Number__c.value;
            this.hcpFormBillingAddress = data.fields.Payto_Street_Address__c.value;
            this.hcpFormMailingAddress = data.fields.Practice_Street_Address__c.value;
            this.hcpFormCounty = data.fields.County__c.value;
            this.hcpFormBillingFormat = data.fields.Billing_Format__c.value;
            this.hcpFormDirectory = data.fields.Directory__c.value;

            //attestation assignments
            this.hcpFormSignature = data.fields.Signature__c.value;
            this.hcpFormTitle = data.fields.Title__c.value;
            this.hcpFormOrganization = data.fields.Organization__c.value;
            this.hcpFormDate = data.fields.Date__c.value;

            //Behavioral Specialties assignments
            this.hcpFormChildren12andYounger = data.fields.Children_12_and_younger__c.value;
            this.hcpFormAdolescents1318 = data.fields.Adolescents_13_to_18__c.value;
            this.hcpFormAdults1964 = data.fields.Adults_19_to_64__c.value;
            this.hcpFormSenior65 = data.fields.Seniors_65_and_older__c.value;
            this.hcpFormMales = data.fields.Males__c.value;
            this.hcpFormFemales = data.fields.Females__c.value;
            this.hcpFormAgressionReplacement = data.fields.Agression_Replacement_Therapy__c.value;
            this.hcpFormAnimalAssisted = data.fields.Animal_assisted__c.value;
            this.hcpFormAttachment = data.fields.Attachment_based_Therapy__c.value;
            this.hcpFormArt = data.fields.Art_Therapy__c.value;
            this.hcpFormBiofeedback = data.fields.Biofeedback__c.value;
            this.hcpFormCognitive = data.fields.Cognitive_Behavioral_Therapy__c.value;
            this.hcpFormDialectical = data.fields.Dialectical_Behavior_Therapy__c.value;
            this.hcpFormEMDR = data.fields.Eye_Mvmnt_Desens_Reproc_Therapy_EMDR__c.value;
            this.hcpFormExposure = data.fields.Exposure_and_Response_Prevention__c.value;
            this.hcpFormMultisystemic = data.fields.Mutisystemic_Therapy_MST__c.value;
            this.hcpFormPsychologicalTesting = data.fields.Psychological_Testing_and_Evaluation__c.value;
            this.hcpFormSexOffender = data.fields.Sex_Offndr_Mgmt_Brd_SOMB_Trtmnt_Provdr__c.value;
            this.hcpFormAdoption = data.fields.Adoption__c.value;
            this.hcpFormAidsHiv = data.fields.AIDS_HIV__c.value;
            this.hcpFormAlz = data.fields.Alzheimer_s_dementia__c.value;
            this.hcpFormAnxiety = data.fields.Anxiety_Panic__c.value;
            this.hcpFormADDADHD = data.fields.ADD_ADHD__c.value;
            this.hcpFormAutism = data.fields.Autism_Spectrum__c.value;
            this.hcpFormBipolar = data.fields.Bipolar_disorder__c.value;
            this.hcpFormBorderlinePersonality = data.fields.Borderline_Personality_Disorder__c.value;
            this.hcpFormBrainInjury = data.fields.Brain_Injury_TBI__c.value;
            this.hcpFormChildAbuse = data.fields.Child_abuse__c.value;
            this.hcpFormChildrenOfAlcoholics = data.fields.Children_of_alcoholics__c.value;
            this.hcpFormChronicPain = data.fields.Chronic_pain_or_illness__c.value;
            this.hcpFormCompulsiveBehaviors = data.fields.Compulsive_behaviors__c.value;
            this.hcpFormConductDisorder = data.fields.Conduct_disorder__c.value;
            this.hcpFormCriminalJustice = data.fields.Criminal_justice__c.value;
            this.hcpFormCulturalIssues = data.fields.Cultural_issues__c.value;
            this.hcpFormDepression = data.fields.Depression__c.value;
            this.hcpFormDevelopmentalDisorders = data.fields.Developmental_disorders__c.value;
            this.hcpFormDisruptive = data.fields.Disruptive_behavior_disorders__c.value;
            this.hcpFormDissociative = data.fields.Dissociative_disorders__c.value;
            this.hcpFormDomestic = data.fields.Domestic_violence__c.value;
            this.hcpFormEatingDisorders = data.fields.Eating_disorders__c.value;
            this.hcpFormElderAbuse = data.fields.Elder_abuse__c.value;
            this.hcpFormEndOfLife = data.fields.End_of_life__c.value;
            this.hcpFormFosterCare = data.fields.Foster_Care__c.value;
            this.hcpFormFamilyTherapy = data.fields.Family_therapy__c.value;
            this.hcpFormGenderIdentity = data.fields.Gender_identity_counseling__c.value;
            this.hcpFormGrief = data.fields.Grief_and_loss__c.value;
            this.hcpFormHabit = data.fields.Habit_Reversal_Therapy__c.value;
            this.hcpFormImpulse = data.fields.Impulse_control__c.value;
            this.hcpFormIntellectual = data.fields.Intellectual_disabilities__c.value;
            this.hcpFormIntimacy = data.fields.Intimacy_issues__c.value;
            this.hcpFormLGBTQ = data.fields.LGBTQ_counseling__c.value;
            this.hcpFormLearningDisabilities = data.fields.Learning_disabilities__c.value;
            this.hcpFormLifeTransitions = data.fields.Life_transitions__c.value;
            this.hcpFormMensIssues = data.fields.Men_s_issues__c.value;
            this.hcpFormMentalHealthCertsOBH = data.fields.Mental_Hlth_Certs_designated_by_OBH__c.value;
            this.hcpFormMoodDisorders = data.fields.Mood_disorders__c.value;
            this.hcpFormNeuropsychiatry = data.fields.Neuropsychiatry__c.value;
            this.hcpFormNeuropsychology = data.fields.Neuropsychology__c.value;
            this.hcpFormObesity = data.fields.Obesity__c.value;
            this.hcpFormOCD = data.fields.Obsessive_compulsive_disorders__c.value;
            this.hcpFormPlay = data.fields.Play_Therapy__c.value;
            this.hcpFormParentingIssues = data.fields.Parenting_issues__c.value;
            this.hcpFormPersonalityDisorders = data.fields.Personality_Dissorders__c.value;
            this.hcpFormPhobias = data.fields.Phobias__c.value;
            this.hcpFormPostPartum = data.fields.Postpartum__c.value;
            this.hcpFormPTSD = data.fields.Post_traumatic_stress__c.value;
            this.hcpFormPsychologicalIllness = data.fields.Psychological_illness__c.value;
            this.hcpFormPsychosis = data.fields.Psychosis__c.value;
            this.hcpFormPsychosomatic = data.fields.Psychosomatic_illness__c.value;
            this.hcpFormQueer = data.fields.Queer_Questioning__c.value;
            this.hcpFormRelationshipIssues = data.fields.Relationship_issues__c.value;
            this.hcpFormRelinquishmentCounseling = data.fields.Relinquishment_counseling__c.value;
            this.hcpFormReproductive = data.fields.Reproductive__c.value;
            this.hcpFormSchizophrenia = data.fields.Schizophrenia__c.value;
            this.hcpFormSelfHarm = data.fields.Self_harm_self_injury__c.value;
            this.hcpFormSexualHarassment = data.fields.Sexual_harassment__c.value;
            this.hcpFormSexualIssues = data.fields.Sexual_issues__c.value;
            this.hcpFormSexualOffenders = data.fields.Sexual_Offenders__c.value;
            this.hcpFormSleep = data.fields.Sleep_insomnia__c.value;
            this.hcpFormSpiritual = data.fields.Spiritual_concerns__c.value;
            this.hcpFormStress = data.fields.Stress_management__c.value;
            this.hcpFormSubstance = data.fields.Subsance_Use_Disorder__c.value;
            this.hcpFormTrauma = data.fields.Trauma__c.value;
            this.hcpFormViolentOffenders = data.fields.Violent_offenders__c.value;
            this.hcpFormWomensIssues = data.fields.Women_s_issues__c.value;

        } else if (error) {
            console.error("Error fetching HCP Form data", error);
        }
    }

    @wire(getRelatedContactFormRecords, { hcpFormId: '$recordId' })
    wiredContactForms({ error, data }) {
        if (data) {
            console.log('Contact Form data:', data); 
            this.relatedContactFormRecords = data.map(contact => {
                return [    contact.Contact_Type__c,
                            contact.FirstName__c, 
                            contact.LastName__c,
                            contact.Title__c, 
                            contact.Email__c,
                            contact.Phone__c,
                        ];
            });
        } else if (error) {
            console.error("Error fetching contact form data", error);
        }
    }

//get related facility records
    @wire(getRelatedFacilityRecords, { hcpFormId: '$recordId' })
    wiredFacilityRecords({ error, data }) {
        if (data) {
            console.log('Facility Records data:', data); 
            this.relatedFacilityRecords = data.map(facility => {
                return [facility.Name, 
                        facility.Street_Address__c, 
                        facility.City__c,
                        facility.State_Province__c,
                        facility.Postal_Code__c,
                        facility.NPI_Number__c,
                        facility.TIN_Number__c,
                        facility.Phone__c,
                        facility.Fax__c,
                        facility.Site_specific_Medicaid_ID__c,
                        facility.Enrollment_Limit__c,
                        facility.Maximum_of_Medicaid_members__c,
                        facility.Office_Hours_Mon_Open__c,
                        facility.Office_Hours_Mon_Close__c,
                        facility.Office_Hours_Tue_Open__c,
                        facility.Office_Hours_Tue_Close__c,
                        facility.Office_Hours_Wed_Open__c,
                        facility.Office_Hours_Wed_Close__c,
                        facility.Office_Hours_Thu_Open__c,
                        facility.Office_Hours_Thu_Close__c,
                        facility.Office_Hours_Fri_Open__c,
                        facility.Office_Hours_Fri_Close__c,
                        facility.Office_Hours_Sat_Open__c,
                        facility.Office_Hours_Sat_Close__c,
                        facility.Office_Hours_Sun_Open__c,
                        facility.Office_Hours_Sun_Close__c,
                        facility.Has24x7Service__c,
                        facility.ADA_access_approach_parking__c,
                        facility.Are_parking_spaces_van_accessible__c,
                        facility.Accessible_examination_room_s__c,
                        facility.Accessible_medical_equip__c,
                        facility.Accommodates_differently_abled_persons__c,
                        facility.Do_you_have_multiple_sites__c,  
                        ]
            });
        } else if (error) {
            console.error("Error fetching facility records data", error);
        }
    }

    //get related Practitioner records
    @wire(getRelatedPractitionerRecords, { hcpFormId: '$recordId' })
    wiredPractitionerRecords({ error, data }) {
        if (data) {
            console.log('Practitioner Records data:', data); 
            this.relatedPractitionerRecords = data.map(practitioner => {
                return [    practitioner.First_Name__c, 
                            practitioner.Last_Name__c, 
                            practitioner.Phone__c,
                            practitioner.Email__c,
                            practitioner.Street_Address__c,
                            practitioner.City__c,
                            practitioner.State_Province__c,
                            practitioner.Zip_Postal_Code__c,
                            practitioner.Date_of_Birth__c,
                            practitioner.Degree_Licensures__c,
                            practitioner.Practicing_Specialty__c,
                            practitioner.Subspecialty__c,
                            practitioner.Primary_Taxonomy_Code__c,
                            practitioner.Secondary_Taxonomy_Code__c,
                            practitioner.Medication_Assistance_Treatment_Cert__c,
                            practitioner.Medicare_ID_Number__c,
                            practitioner.Medicaid_ID_Number__c,
                            practitioner.Provider_NPI__c,
                            practitioner.CAQH_Number__c,
                            practitioner.Additional_Languages_Spoken__c,
                            practitioner.Accepting_New_Patients__c,
                            practitioner.My_Clients_Include__c,
                            practitioner.Interpretive_Services_Provided__c,
                            practitioner.Gender__c,
                            practitioner.Provider_Race__c,
                            practitioner.Provider_Ethnicity__c,
                            practitioner.Provider_Gender_Pronouns__c,
                            practitioner.Completed_Cultural_Competency_Resp_Trng__c,
                            practitioner.Date_compltd_cult_competency_resp_trng__c,
                            practitioner.Training_Provided_by_Colorado_Access__c,
                            practitioner.Training_Provided_By__c,
                            practitioner.Practice_Site_Locations_From_Prev_Pgs__c,
                            practitioner.Practicing_Only_In_Inpat_Hosp_Capacity__c,
                            practitioner.Svcs_Provided_Only_in_Nurs_Hosp_Facils__c

                        ];
            });
        } else if (error) {
            console.error("Error fetching practitioner records data", error);
        }
    }

    //get Owner Individual Records
    @wire(getRelatedHealthcareIndividualFormRecords, { hcpFormId: '$recordId' })
    wiredHealthcareIndividualForms({ error, data }) {
        if (data) {
            console.log('Healthcare Individual Form data:', data); 
            this.relatedHealthcareIndividualFormRecords = data.map(individual => {
                return [    individual.Name,
                            individual.Owner_Title__c,
                            individual.percent_of_ownership__c,
                            individual.Address__c,
                            individual.Owner_DOB__c,
                            individual.Owner_SSN__c,
                        ];
            });
        } else if (error) {
            console.error("Error fetching healthcare individual form data", error);
        }
    }

//get Owner corporation Records
    @wire(getRelatedHealthcareOrganizationFormRecords, { hcpFormId: '$recordId' })
    wiredHealthcareOrganizationForms({ error, data}) {
        if (data) {
            console.log('Healthcare Organization Form data:', data);
            this.relatedHealthcareOrganizationFormRecords = data.map(organization => {
                return [    organization.Name_of_corporation__c,
                            organization.TIM__c,
                            organization.percent_of_ownership__c,
                            organization.Primary_Business_Address__c,
                            organization.Every_Business_Location__c,
                            organization.PO_Box_Addresses__c,    
                        ];
            });
        } else if (error) {
            console.error("Error fetching healthcare organization form data", error);
        }
    }
//end get Owner corporation Records


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
                this.hcpFormWebsiteAddress]
        ];
        
        const tableData2 = this.relatedContactFormRecords;

        const tableData3 = this.relatedHealthcareIndividualFormRecords;

        const tableData4 = this.relatedHealthcareOrganizationFormRecords;

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
            "Website Address": record [7]
        }));
    
        const practiceInfoData = [
            {"Field": "Practice Owned by a Woman", "Value": this.hcpFormPracticeOwnedByAWoman},
            {"Field": "Practice is owned by a person of color", "Value": this.hcpFormPracticeIsOwnedByAPersonOfColor},
            {"Field": "Practice owner POC specification", "Value": this.hcpFormPracticeOwnerPOCSpecification},
            {"Field": "Practice is owned by a veteran", "Value": this.hcpFormPracticeIsOwnedByAVeteran},
            {"Field": "Practice owned by veteran diff abled", "Value": this.hcpFormPracticeOwnedByVeteranDiffAbled},
            {"Field": "Practice owned by person diff abled", "Value": this.hcpFormPracticeIsOwnedByAPersonOfColor},
            {"Field": "Practice is 100% Telehealth", "Value": this.hcpFormPracticeIsTelehealth},
            {"Field": "Community Mental Health Center (CMHC)", "Value": this.hcpFormCommunityMentalHealthCenterCMHC},
            {"Field": "Essential Safety Net Provider (ESNP)", "Value": this.hcpFormEssentialSafetyNetProviderESNP}, //new field added June 25, 2024
            {"Field": "Comprehensive Safety Net Provider (CSNP)", "Value": this.hcpFormComprehensiveSafetyNetProviderCSNP}, //new field added June 25, 2024
            {"Field": "Substance Use Disorder clinic", "Value": this.hcpFormSubstanceAbuseDisorderClinic},
            {"Field": "ASAM Levels", "Value": this.hcpFormASAMLevels}, //new field added June 26, 2024
            {"Field": "Indian Health Care Provider (IHCP)", "Value": this.hcpFormIndianHealthCareProviderIHCP},
            {"Field": "Essential Community Provider (ECP)", "Value": this.hcpFormEssentialCommunityProviderECP},
            {"Field": "School-based Health Care Center (SBHC)", "Value": this.hcpFormSchoolBasedHealthCareCenterSBHC},
            {"Field": "Practice provides a HIPAA compliant teleheatlh service", "Value": this.hcpFormProvidesHIPAACompliantTelehealthServices},
            {"Field": "Practice provides American Sign Language Services (ASL)", "Value": this.hcpFormProvidesAmericanSignLanguageServicesASL},
            {"Field": "Federally Qualified Health Center (FQHC)", "Value": this.hcpFormFederallyQualifiedHealthCenterFQHC},
            {"Field": "Rural Health Center (RHC)", "Value": this.hcpFormRuralHealthCenterRHC},
            {"Field": "Pediatric Only", "Value": this.hcpFormPediatricOnly},
            {"Field": "Women Only", "Value": this.hcpFormWomenOnly},
            {"Field": "Adults Only", "Value": this.hcpFormAdultsOnly},
            {"Field": "Capable of Billing Medicare", "Value": this.hcpFormCapableOfBillingMedicare},
            {"Field": "Capable of Billing Medicaid", "Value": this.hcpFormCapableOfBillingMedicaid},
            {"Field": "Ages seen in Practice", "Value": this.hcpFormAgesSeenInPractice}
        ];
        const worksheetPracticeInfo = XLSX.utils.json_to_sheet(practiceInfoData, { header: ["Field", "Value"] });

        const worksheet1 = XLSX.utils.json_to_sheet(worksheetData1);
        XLSX.utils.book_append_sheet(workbook, worksheet1, 'General Information');

        XLSX.utils.book_append_sheet(workbook, worksheetPracticeInfo, 'Practice Info');

        //Add a new sheet manually for accreditations
        const accredData = [
            {"Field": "Accreditation Association for Ambulatory Health Care (AAAHC)", "Value": this.hcpFormAccrAAACH},
            {"Field": "Year of Accreditation (AAAHC)", "Value": this.hcpFormYearAAACH},
            {"Field": "Joint Commission on Accreditation of Healthcare Organizations (JCAHO)", "Value": this.hcpFormAccrJCAHO},
            {"Field": "Year of Accreditation (JCAHO)", "Value": this.hcpFormYearJCAHO},
            {"Field": "National Committee for Quality Assurance (NCQA)", "Value": this.hcpFormAccrNCQA},
            {"Field": "Year of Accreditation (NCQA)", "Value": this.hcpFormYearNCQA},
            {"Field": "Utilization Review Accreditation Commission (URAC)", "Value": this.hcpFormAccrURAC},
            {"Field": "Year of Accreditation (URAC)", "Value": this.hcpFormYearURAC},
            {"Field": "Substance Use Disorder (SUD) Accreditations", "Value": this.hcpFormSUD}, //new field added June 25, 2024
        ]; //accreditation data table
        
        const worksheetAccredInfo = XLSX.utils.json_to_sheet(accredData, { header: ["Field", "Value"]});
        XLSX.utils.book_append_sheet(workbook, worksheetAccredInfo, "Accreditations");
        //End new tab

        //Add Billing Information Section
        const billingData = [
            {"Field": "Make Checks Payable To: ", "Value": this.hcpFormMakeChecksPayable},
            {"Field": "Federal Tax Id No. ", "Value": this.hcpFormProviderTaxID},
            {"Field": "Organizational / Individual NPI#", "Value": this.hcpFormProviderNPI},
            {"Field": "Organizational / Individual Medicaid #", "Value": this.hcpFormOrganizationMedicaidID},
            {"Field": "Organizational Medicare #", "Value": this.hcpFormOrganizationMedicareNumber},
            {"Field": "Billing/Remit Address", "Value": this.hcpFormBillingAddress},
            {"Field": "Mailing Address", "Value": this.hcpFormMailingAddress},
            {"Field": "County of Practice Location", "Value": this.hcpFormCounty},
            {"Field": "Billing Format (CMS 1500 or UB 04)", "Value": this.hcpFormBillingFormat},
            {"Field": "Include Info in Provider Directory", "Value": this.hcpFormDirectory},
        ];
        
        const worksheetBillingInfo = XLSX.utils.json_to_sheet(billingData, { header: ["Field", "Value"]});
        XLSX.utils.book_append_sheet(workbook, worksheetBillingInfo, "Billing Info");
        //End new tab

        //Create worksheet and tab for Locations

        // ***NOTE: Architecture as built by Spaulding Ridge references "Facilities".  It was determined by contracting
        // that this would be confusing to the end users, so the label in the excel document was changed to "Locations"***

        const worksheetDataFacility = this.relatedFacilityRecords.map(record => ({
            "Location Name": record[0],
            "Street Address": record[1],
            "City": record[2],
            "State": record[3],
            "Zip Code": record[4],
            "NPI": record[5],
            "TIN": record[6],
            "Phone": record[7],
            "Fax": record[8],
            "Site-specific Medicaid ID": record[9],
            "Enrollment Limit": record[10],
            "Maximum # of Medicaid members": record[11],

            //hours of operation
            "Monday Open": record[12],
            "Monday Close": record[13],
            "Tuesday Open": record[14],
            "Tuesday Close": record[15],
            "Wednesday Open": record[16],
            "Wednesday Close": record[17],
            "Thursday Open": record[18],
            "Thursday Close": record[19],
            "Friday Open": record[20],
            "Friday Close": record[21],
            "Saturday Open": record[22],
            "Saturday Close": record[23],
            "Sunday Open": record[24],
            "Sunday Close": record[25],

            //misc. and accommodation info
            "Practice has 24/7 triage phone coverage": record[26],
            "ADA accessible approach/parking": record[27],
            "Parking spaces are van accessible": record[28],
            "Accessible examination room": record[29],
            "Accessible medical equipment": record[30],
            "Accommodates differently abled persons": record[31],
            "Multiple Sites": record[32],
        }));

        const worksheetFacility = XLSX.utils.json_to_sheet(worksheetDataFacility);
        XLSX.utils.book_append_sheet(workbook, worksheetFacility, 'Locations');
        //End Locations worksheet

        //Create worksheet and tab for Practitioners
        const worksheetDataPractitioner = this.relatedPractitionerRecords.map(record => ({
            "First Name": record[0],
            "Last Name": record[1],
            "Phone": record[2],
            "Email": record[3],
            "Street Address": record[4],
            "City": record[5],
            "State/Province": record[6],
            "Zip / Postal Code": record[7],
            "Date of Birth": record[8],
            "Degree/Licensures": record[9],
            "Practicing Specialty": record[10],
            "Subspecialty": record[11],
            "Primary Taxonomy Code": record[12],
            "Secondary Taxonomy Code": record[13],
            "MAT Certified": record[14],
            "Mediare ID Number": record[15],
            "Medicaid ID Number": record[16],
            "Individual NPI #": record[17],
            "CAQH#": record[18],
            "Additional Languages Spoken": record[19],
            "Accepting New Patients": record[20],
            "Populations Served": record[21],
            "Interpretive Services Provided": record[22],
            "Gender": record[23],
            "Provider Race": record[24],
            "Provider Ethnicity": record[25],
            "Provider Gender Pronouns": record[26],
            "Cultural Competency Responsiveness Training Complete": record[27],
            "Date completed CCRT": record[28],
            "Training Provided by CoA": record[29],
            "Training Provided By (Other)": record[30],
            "Practice Site Locations from Previous Pages": record[31],
            "Inpatient/Hospitalist Capacity ONLY": record[32],
            "Nursing or Hostpital Facilities ONLY": record[33],

        }));

        const worksheetPractitioner = XLSX.utils.json_to_sheet(worksheetDataPractitioner);
        XLSX.utils.book_append_sheet(workbook, worksheetPractitioner, 'Practitioners');


        const worksheetData2 = tableData2.map(record => ({
            "Contact Type": record[0],
            "First Name": record[1],
            "Last Name": record[2],
            "Title": record[3],
            "Email": record[4],
            "Phone": record[5],
        }));
        const worksheet2 = XLSX.utils.json_to_sheet(worksheetData2, {
            header: ["Contact Type",
                     "First Name",
                     "Last Name",
                     "Title",
                     "Email",
                     "Phone"
                ]
        });
        XLSX.utils.book_append_sheet(workbook, worksheet2, 'Contacts');

        //add Owner Individual Tab

        const ownerIData = tableData3.map(record => ({
            "Name": record[0],
            "Owner Title": record[1],
            "Percent of Ownership": record[2],
            "Address": record[3],
            "Owner Date of Birth": record[4],
            "Owner SSN": record[5]
        }));

        const ownerIsheet = XLSX.utils.json_to_sheet(ownerIData, {
            header: ["Name",]
        });
        
        XLSX.utils.book_append_sheet(workbook, ownerIsheet, "Owner - Individuals");
        
        //add Owner Corporation Tab

        const ownerOData = tableData4.map(record => ({
            "Name of Corporation": record[0],
            "Corporate TIN": record[1],
            "Percent of Ownership": record[2],
            "Primary Business Address": record[3],
            "Every Business Location": record[4],
            "PO Box Address": record[5]
        }));

        const ownerOsheet = XLSX.utils.json_to_sheet(ownerOData, {
            header: [   "Name of Corporation",
                        "Corporate TIN",
                        "Percent of Ownership",
                        "Primary Business Address",
                        "Every Business Location",
                        "PO Box Address"
                    
                    ]
        });

        XLSX.utils.book_append_sheet(workbook, ownerOsheet, "Owner - Corporations");
        
        //Add attestation Information Section
        const attestationData = [
            {"Field": "Signature", "Value": this.hcpFormSignature},
            {"Field": "Title", "Value": this.hcpFormTitle},
            {"Field": "Organization", "Value": this.hcpFormOrganization},
            {"Field": "Date", "Value": this.hcpFormDate},
        ];

        const worksheetAttest = XLSX.utils.json_to_sheet(attestationData, { header: ["Field", "Value"]});
        XLSX.utils.book_append_sheet(workbook, worksheetAttest, "Attestation");


        //Add Behavioral Health Specialty Information Section
        const behavioralData = [
            {"Field": "Children 12 and Younger", "Value": this.hcpFormChildren12andYounger},
            {"Field": "Adolescents 13-18", "Value": this.hcpFormAdolescents1318},
            {"Field": "Adults 19-64", "Value": this.hcpFormAdults1964},
            {"Field": "Seniors 65 and older", "Value": this.hcpFormSenior65},
            {"Field": "Males", "Value": this.hcpFormMales},
            {"Field": "Females", "Value": this.hcpFormFemales},
            {"Field": " ", "Value": " "},

            {"Field": "Treatment Modalities", "Value": " "},
            {"Field": "Agression Replacement Therapy", "Value": this.hcpFormAgressionReplacement},
            {"Field": "Animal Assisted Therapy", "Value": this.hcpFormAnimalAssisted},
            {"Field": "Attachment-Based Therapy", "Value": this.hcpFormAttachment},
            {"Field": "Art Therapy", "Value": this.hcpFormArt},
            {"Field": "Biofeedback", "Value": this.hcpFormBiofeedback},
            {"Field": "Cognitive Behavioral Therapy", "Value": this.hcpFormCognitive},
            {"Field": "Dialectical Behavior Therapy", "Value": this.hcpFormDialectical},
            {"Field": "EMDR", "Value": this.hcpFormEMDR},
            {"Field": "Exposure and Response Prevention", "Value": this.hcpFormExposure},
            {"Field": "Multi-Systemic Therapy (MST)", "Value": this.hcpFormMultisystemic},
            {"Field": "Psychological Testing and Evaluation", "Value": this.hcpFormPsychologicalTesting},
            {"Field": "Sex Offender Management Board", "Value": this.hcpFormSexOffender},

            {"Field": " ", "Value": " "},
            {"Field": "Specialties", "Value": " "},
            {"Field": "Adoption", "Value": this.hcpFormAdoption},
            {"Field": "AIDS/HIV", "Value": this.hcpFormAidsHiv},
            {"Field": "Alzheimers/dementia", "Value": this.hcpFormAlz},
            {"Field": "Anxiety / Panic", "Value": this.hcpFormAnxiety},
            {"Field": "ADD / ADHD", "Value": this.hcpFormADDADHD},
            {"Field": "Autism Spectrum", "Value": this.hcpFormAutism},
            {"Field": "Bipolar Disorder", "Value": this.hcpFormBipolar},
            {"Field": "Borderline Personality Disorder", "Value": this.hcpFormBorderlinePersonality},
            {"Field": "Brain Injury (TBI)", "Value": this.hcpFormBrainInjury},
            {"Field": "Child Abuse", "Value": this.hcpFormChildAbuse},
            {"Field": "Children of Alcoholics", "Value": this.hcpFormChildrenOfAlcoholics},
            {"Field": "Chronic Pain or Illness", "Value": this.hcpFormChronicPain},
            {"Field": "Compulsive Behaviors", "Value": this.hcpFormCompulsiveBehaviors},
            {"Field": "Conduct Disorder", "Value": this.hcpFormConductDisorder},
            {"Field": "Criminal Justice", "Value": this.hcpFormCriminalJustice},
            {"Field": "Cultural Issues", "Value": this.hcpFormCulturalIssues},

            {"Field": "Depression", "Value": this.hcpFormDepression},
            {"Field": "Developmental Disorders", "Value": this.hcpFormDevelopmentalDisorders},
            {"Field": "Disruptive Behavior Disorders", "Value": this.hcpFormDisruptive},
            {"Field": "Dissociative Disorders", "Value": this.hcpFormDissociative},
            {"Field": "Domestic Violence", "Value": this.hcpFormDomestic},
            {"Field": "Eating Disorders", "Value": this.hcpFormEatingDisorders},
            {"Field": "Elder Abuse", "Value": this.hcpFormElderAbuse},
            {"Field": "End Of Life", "Value": this.hcpFormEndOfLife},
            {"Field": "Foster Care", "Value": this.hcpFormFosterCare},
            {"Field": "Family Therapy", "Value": this.hcpFormFamilyTherapy},
            {"Field": "Gender Identity Counseling", "Value": this.hcpFormGenderIdentity},
            {"Field": "Grief and Loss", "Value": this.hcpFormGrief},
            {"Field": "Habit Reversal Therapy", "Value": this.hcpFormHabit},
            {"Field": "Impulse Control", "Value": this.hcpFormImpulse},
            {"Field": "Intellectual Disabilities", "Value": this.hcpFormIntellectual},

            {"Field": "Intimacy Issues", "Value": this.hcpFormIntimacy},
            {"Field": "LGBTQ Counseling", "Value": this.hcpFormLGBTQ},
            {"Field": "Learning Disabilities", "Value": this.hcpFormLearningDisabilities},
            {"Field": "Life Transitions", "Value": this.hcpFormLifeTransitions},
            {"Field": "Men's Issues", "Value": this.hcpFormMensIssues},
            {"Field": "Mental Health Certifications designated by OBH", "Value": this.hcpFormMentalHealthCertsOBH},
            {"Field": "Mood Disorders", "Value": this.hcpFormMoodDisorders},
            {"Field": "Neuropsychiatry", "Value": this.hcpFormNeuropsychiatry},
            {"Field": "Neuropsychology", "Value": this.hcpFormNeuropsychology},
            {"Field": "Obesity", "Value": this.hcpFormObesity},
            {"Field": "Obsessive Compulsive Disorders", "Value": this.hcpFormOCD},
            {"Field": "Play Therapy", "Value": this.hcpFormPlay},
            {"Field": "Parenting Issues", "Value": this.hcpFormParentingIssues},
            {"Field": "Personality Disorders", "Value": this.hcpFormPersonalityDisorders},
            {"Field": "Phobias", "Value": this.hcpFormPhobias},

            {"Field": "Postpartum", "Value": this.hcpFormPostPartum},
            {"Field": "Post Traumatic Stress", "Value": this.hcpFormPTSD},
            {"Field": "Psychological Illness", "Value": this.hcpFormPsychologicalIllness},
            {"Field": "Psychosis", "Value": this.hcpFormPsychosis},
            {"Field": "Psychosomatic Illness", "Value": this.hcpFormPsychosomatic},
            {"Field": "Queer / Questioning", "Value": this.hcpFormQueer},
            {"Field": "Relationship Issues", "Value": this.hcpFormRelationshipIssues},
            {"Field": "Relinquishment Counseling", "Value": this.hcpFormRelinquishmentCounseling},
            {"Field": "Reproductive", "Value": this.hcpFormReproductive},
            {"Field": "Schizophrenia", "Value": this.hcpFormSchizophrenia},
            {"Field": "Self-Harm / Self-Injury", "Value": this.hcpFormSelfHarm},
            {"Field": "Sexual Harassment", "Value": this.hcpFormSexualHarassment},
            {"Field": "Sexual Issues", "Value": this.hcpFormSexualIssues},
            {"Field": "Sexual Offenders", "Value": this.hcpFormSexualOffenders},
            {"Field": "Sleep / Insomnia", "Value": this.hcpFormSleep},

            {"Field": "Spiritual Concerns", "Value": this.hcpFormSpiritual},
            {"Field": "Stress Management", "Value": this.hcpFormStress},
            {"Field": "Substance Use Disorder", "Value": this.hcpFormSubstance},
            {"Field": "Trauma", "Value": this.hcpFormTrauma},
            {"Field": "Violent Offenders", "Value": this.hcpFormViolentOffenders},
            {"Field": "Women's Issues", "Value": this.hcpFormWomensIssues},

        ];
        
        const worksheetBehavioralInfo = XLSX.utils.json_to_sheet(behavioralData, { header: ["Field", "Value"]});
        XLSX.utils.book_append_sheet(workbook, worksheetBehavioralInfo, "Behavioral Specialties");
        //End new tab

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}