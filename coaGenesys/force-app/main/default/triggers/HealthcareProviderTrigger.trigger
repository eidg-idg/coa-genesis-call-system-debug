trigger HealthcareProviderTrigger on HealthcareProvider (after insert) {
    // Define record type IDs
    String triggeringRecordTypeId = '0125f000000iIQTAA2'; // Updated value: 0125f000000iIQTAA2 = value for Supplier Location in Production
    String searchingRecordTypeId = '0125f000000zJzmAAE'; // Updated value: 0125f000000zJzmAAE = value for Prospective Provider in Production

        // Create a set of NPI values for the new records that have the specified record type
    Set<String> npiValues = new Set<String>();
    List<Id> idsToDelete = new List<Id>();
    
    for (HealthcareProvider hcp : Trigger.new) {
        if (hcp.RecordTypeId == triggeringRecordTypeId) {
            npiValues.add(hcp.UST_EPLUS__Provider_NPI__c);
        }
    }

    // If we have any NPI values to search for, proceed
    if (!npiValues.isEmpty()) {
        // Query for existing records with the searching record type and matching NPI values
        List<HealthcareProvider> matchingRecords = [
            SELECT Id, RecordTypeId, UST_EPLUS__Provider_NPI__c 
            FROM HealthcareProvider 
            WHERE UST_EPLUS__Provider_NPI__c IN :npiValues 
            AND RecordTypeId = :searchingRecordTypeId
        ];

        // If matches are found based on NPI, update the matched records and schedule the deletion of the triggering records
        if(!matchingRecords.isEmpty()) {
            // Modify the record type of the matching records
            for (HealthcareProvider hcp : matchingRecords) {
                hcp.RecordTypeId = triggeringRecordTypeId;
            }
            update matchingRecords;

            // Add the triggering records to the deletion list
            for (HealthcareProvider hcp : Trigger.new) {
                if (hcp.RecordTypeId == triggeringRecordTypeId) {
                    idsToDelete.add(hcp.Id);
                }
            }

            // Enqueue the delayed deletion job
            if(!idsToDelete.isEmpty()) {
                System.enqueueJob(new DelayedDeleteHandler(idsToDelete));
            }
        }
    }
}