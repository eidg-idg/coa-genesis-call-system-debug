/**
 * @description       : 
 * @author            : Jason.Kuczek@coaccess.com
 * @group             : 
 * @last modified on  : 09-29-2023
 * @last modified by  : Jason.Kuczek@coaccess.com
**/
public with sharing class ExportToExcelControllerHCP {
    
    @AuraEnabled(cacheable=true)
    public static List<Contact_Form__c> getRelatedContactFormRecords(String hcpFormId) {
        if (Schema.sObjectType.Contact_Form__c.isAccessible()) {
            return [SELECT  Contact_Type__c,
                            FirstName__c,
                            LastName__c,
                            Title__c,
                            Email__c,
                            Phone__c
                             
                    FROM Contact_Form__c 
                    WHERE Healthcare_Provider_Form__c = :hcpFormId];
        } else {
            throw new SecurityException('Access to Contact_Form__c object denied.');
        }
    }

//method to retrieve Owner Individual data

@AuraEnabled(cacheable=true)
public static List<Healthcare_Individual_Form__c> getRelatedHealthcareIndividualFormRecords(String hcpFormId) {
    if (Schema.sObjectType.Healthcare_Individual_Form__c.isAccessible()) {
        return [SELECT  Name,
                        Owner_Title__c,
                        percent_of_ownership__c,
                        Address__c,
                        Owner_DOB__c,
                        Owner_SSN__c
                FROM Healthcare_Individual_Form__c 
                WHERE Healthcare_Provider_Form__c = :hcpFormId];
    } else {
        throw new SecurityException('Access to Healthcare_Individual_Form__c object denied.');
    }
}
//end owner individual method


//Start method to retrieve Owner corporation data

@AuraEnabled(cacheable=true)
public static List<Healthcare_Organization_Form__c> getRelatedHealthcareOrganizationFormRecords(String hcpFormId) {
    if (Schema.sObjectType.Healthcare_Organization_Form__c.isAccessible()) {
        return [SELECT  Name_of_corporation__c,
                        TIM__c,
                        percent_of_ownership__c,
                        Primary_Business_Address__c,
                        Every_Business_Location__c,
                        PO_Box_Addresses__c
                
                FROM Healthcare_Organization_Form__c 
                WHERE Healthcare_Provider_Form__c = :hcpFormId];
    } else {
        throw new SecurityException('Access to Healthcare_Organization_Form__c object denied.');
    }
}
//end owner corporation method

    @AuraEnabled(cacheable=true)
    public static List<Healthcare_Practitioner_facility_Form__c> getRelatedFacilityRecords(String hcpFormId) {
        if (Schema.sObjectType.Healthcare_Practitioner_facility_Form__c.isAccessible()) {
            return [SELECT  Name, 
                            Street_Address__c, 
                            City__c,
                            State_Province__c,
                            Postal_Code__c,
                            NPI_Number__c,
                            TIN_Number__c,
                            Phone__c,
                            Fax__c,
                            Site_specific_Medicaid_ID__c,
                            Enrollment_Limit__c,
                            Maximum_of_Medicaid_members__c,
                            Office_Hours_Mon_Open__c,
                            Office_Hours_Mon_Close__c,
                            Office_Hours_Tue_Open__c,
                            Office_Hours_Tue_Close__c,
                            Office_Hours_Wed_Open__c,
                            Office_Hours_Wed_Close__c,
                            Office_Hours_Thu_Open__c,
                            Office_Hours_Thu_Close__c,
                            Office_Hours_Fri_Open__c,
                            Office_Hours_Fri_Close__c,
                            Office_Hours_Sat_Open__c,
                            Office_Hours_Sat_Close__c,
                            Office_Hours_Sun_Open__c,
                            Office_Hours_Sun_Close__c,
                            Has24x7Service__c,
                            ADA_access_approach_parking__c,
                            Are_parking_spaces_van_accessible__c,
                            Accessible_examination_room_s__c,
                            Accessible_medical_equip__c,
                            Accommodates_differently_abled_persons__c,
                            Do_you_have_multiple_sites__c
                            
                    FROM Healthcare_Practitioner_facility_Form__c 
                    WHERE Healthcare_Provider_Form__c = :hcpFormId];
        } else {
            throw new SecurityException('Access to Healthcare_Practitioner_facility_Form__c object denied.');
        }
    }

        @AuraEnabled(cacheable=true)
    public static List<Practitioner_Contact_Form__c> getRelatedPractitionerRecords(String hcpFormId) {
        if (Schema.sObjectType.Practitioner_Contact_Form__c.isAccessible()) {
            return [SELECT  First_Name__c, 
                            Last_Name__c, 
                            Phone__c,
                            Email__c,
                            Street_Address__c,
                            City__c,
                            State_Province__c,
                            Zip_Postal_Code__c,
                            Date_of_Birth__c,
                            Degree_Licensures__c,
                            Practicing_Specialty__c,
                            Subspecialty__c,
                            Primary_Taxonomy_Code__c,
                            Secondary_Taxonomy_Code__c,
                            Medication_Assistance_Treatment_Cert__c,
                            Medicare_ID_Number__c,
                            Medicaid_ID_Number__c,
                            Provider_NPI__c,
                            CAQH_Number__c,
                            Additional_Languages_Spoken__c,
                            Accepting_New_Patients__c,
                            My_Clients_Include__c,
                            Interpretive_Services_Provided__c,
                            Gender__c,
                            Provider_Race__c,
                            Provider_Ethnicity__c,
                            Provider_Gender_Pronouns__c,
                            Completed_Cultural_Competency_Resp_Trng__c,
                            Date_compltd_cult_competency_resp_trng__c,
                            Training_Provided_by_Colorado_Access__c,
                            Training_Provided_By__c,
                            Practice_Site_Locations_From_Prev_Pgs__c,
                            Practicing_Only_In_Inpat_Hosp_Capacity__c,
                            Svcs_Provided_Only_in_Nurs_Hosp_Facils__c

                    FROM Practitioner_Contact_Form__c 
                    WHERE Healthcare_Provider_Form__c = :hcpFormId];
        } else {
            throw new SecurityException('Access to Practitioner_Contact_Form__c object denied.');
        }
    }
    
}