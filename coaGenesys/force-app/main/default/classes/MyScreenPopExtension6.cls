global class MyScreenPopExtension6 implements purecloud.CTIExtension.ScreenPop {
    public String onScreenPop(String jsonData) {
        // Deserialize the inbound JSON data to a Map
        Map<String, Object> deserializedData = (Map<String, Object>) JSON.deserializeUntyped(jsonData);
        System.debug('Full data string: ' + deserializedData);
        
        // Extract the searchValue from the deserialized data
        String searchValue = (String)deserializedData.get('searchValue');
        System.debug('The CTI Search Value is: ' + searchValue);
        
        // Check if searchValue starts with +1 and remove it if present
        if (searchValue != null && searchValue.startsWith('+1')) {
            searchValue = searchValue.substring(2); // Remove the first two characters (+1)
            System.debug('Modified CTI Search Value: ' + searchValue);
        }
        
        // Prepare the data to return
        Map<String, Object> dataToReturn = new Map<String, Object>();
        
        // Search for an Account record using the searchValue
        if (String.isNotBlank(searchValue)) {
            List<Account> accounts = [SELECT Id, Name, Phone, UST_EPLUS__Member_ID__c, PersonBirthdate, HealthCloudGA__BirthDate__pc, PersonMailingAddress, UST_EPLUS__PersonBirthDate__c FROM Account WHERE Phone = :searchValue];
            System.debug('The Result of the Account match is: ' + accounts);
            
            // If Accounts are found
            if (!accounts.isEmpty()) {
                List<String> accountIds = new List<String>();
                for (Account acc : accounts) {
                    accountIds.add(acc.Id);
                }
                
                // Serialize the list of Account IDs
                String accountIdsJson = JSON.serialize(accountIds);
                String vfPageURL = '/apex/VerifyMemberVisualforcePage?ids=' + EncodingUtil.urlEncode(accountIdsJson, 'UTF-8');
                System.debug('Navigating to Visualforce page with URL: ' + vfPageURL);
                
                dataToReturn.put('url', vfPageURL);
                return JSON.serialize(dataToReturn);
            } else {
                
                //Create a variable to store the RecordTypeId for HCP(Supplier Location) and query the org based on Recordtype.Name
                RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
                //Assign the Id value to a variable to bind in future queries
                String recordTypeId = rt.Id;
                
                // Search for a HealthcareProvider record if no Account was found
                List<HealthcareProvider> healthcareProviders = [SELECT Id, Name, UST_EPLUS__Primary_Phone_Number__c FROM HealthcareProvider WHERE UST_EPLUS__Primary_Phone_Number__c = :searchValue AND RecordTypeId = :recordTypeId LIMIT 1];
                System.debug('The Result of the Healthcare Provider match is: ' + healthcareProviders);
                
                // If a Healthcare Provider is found
                if (!healthcareProviders.isEmpty()) {
                    HealthcareProvider foundHCP = healthcareProviders[0];
                    System.debug(foundHCP);
                    
                    // Construct the URL to navigate to the Visualforce page, passing the HealthcareProvider ID
                    String vfPageURL = '/apex/VerifyHealthcareProviderVisualforcePage?id=' + foundHCP.Id;
                    System.debug('Navigating to Visualforce page with URL: ' + vfPageURL);
                    
                    dataToReturn.put('url', vfPageURL);
                    return JSON.serialize(dataToReturn);
                }
            }
        }
        
        // If no specific conditions are met, default to the standard screen pop behavior
        dataToReturn.put('defaultScreenPop', true);
        return JSON.serialize(dataToReturn);
    }
}