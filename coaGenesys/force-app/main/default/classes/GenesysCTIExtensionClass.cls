global class GenesysCTIExtensionClass implements purecloud.CTIExtension.ScreenPop {
    public String onScreenPop(String jsonData) {
        
        // Deserialize the inbound JSON data to a Map
        Map<String, Object> deserializedData = (Map<String, Object>) JSON.deserializeUntyped(jsonData);
        System.debug('Full data string: ' + deserializedData);
 
        // Enhanced Variables Section
        // Includes checks for embedded data, as well as null values as defaults if no Genesys value is present.
        
        // Extract embedded interaction data if present
        Map<String, Object> interactionData = deserializedData.containsKey('interaction') ? (Map<String, Object>) deserializedData.get('interaction') : new Map<String, Object>();
        System.debug('Interaction Extraction String: ' + interactionData);
        
        // Extract embedded attributes data if present
        Map<String, Object> attributeData = interactionData.containsKey('attributes') ? (Map<String, Object>) interactionData.get('attributes') : new Map<String, Object>();
        System.debug('Attribute Extractions String: ' + attributeData);
        
        // Extract sf_searchvalue from attributes data if present
        String sfSearchValue = attributeData.containsKey('sf_searchvalue') ? (String) attributeData.get('sf_searchvalue') : '';
        System.debug('SF Search Value String format before parsing: ' + sfSearchValue);
        
        // Parse Attribute Data as JSON if present
        Map<String, Object> sfSearchValueData = String.isNotBlank(sfSearchValue) ? (Map<String, Object>) JSON.deserializeUntyped(sfSearchValue) : new Map<String, Object>();
        System.debug('Parsed Attribute data as JSON: ' + sfSearchValueData);

        // Extract Individual Field Values and Assign them to SF Variables
        String sf_last4SSN = sfSearchValueData.containsKey('Last4SSN') ? (String) sfSearchValueData.get('Last4SSN') : null;
        System.debug('The Last 4 SSN value from the interaction payload is: ' + sf_last4SSN);
        
        String sf_ANI = sfSearchValueData.containsKey('ANI') ? (String) sfSearchValueData.get('ANI') : null;
        System.debug('The ANI value from the interaction payload is: ' + sf_ANI);
        
        String sf_RecordId = sfSearchValueData.containsKey('RecordID') ? (String) sfSearchValueData.get('RecordID') : null;
        System.debug('The SF Record Id from the interaction payload is: ' + sf_RecordId);
        
        // Extract the searchValue from the deserialized data
        String searchValue = deserializedData.containsKey('searchValue') ? (String) deserializedData.get('searchValue') : null;
        System.debug('The CTI Search Value is: ' + searchValue);
        
        // Check if searchValue starts with +1 and remove it if present
        if (searchValue != null && searchValue.startsWith('+1')) {
            searchValue = searchValue.substring(2); // Remove the first two characters (+1)
            System.debug('Modified CTI Search Value: ' + searchValue);
        }
        
        // Prepare the data to return
        Map<String, Object> dataToReturn = new Map<String, Object>();
        
        // Lists to store Account Ids based on matching criteria
        List<String> bothMatches = new List<String>();
        List<String> ssnMatches = new List<String>();
        List<String> phoneMatches = new List<String>();
        
        // Query for Accounts matching both Phone and Last_4_SSN_V2__c
        if (String.isNotBlank(searchValue) && String.isNotBlank(sf_last4SSN)) {
            System.debug('Querying for accounts matching both Phone and Last_4_SSN_V2__c');
            List<Account> bothMatchAccounts = [SELECT Id FROM Account WHERE Phone = :searchValue AND Last_4_SSN_V2__c = :sf_last4SSN];
            System.debug('Accounts matching both Phone and Last_4_SSN_V2__c: ' + bothMatchAccounts.size());
            for (Account acc : bothMatchAccounts) {
                bothMatches.add(acc.Id);
            }
        }
        
        // Query for Accounts matching Last_4_SSN_V2__c only
        if (String.isNotBlank(sf_last4SSN)) {
            System.debug('Querying for accounts matching Last_4_SSN_V2__c');
            List<Account> ssnMatchAccounts = [SELECT Id FROM Account WHERE Last_4_SSN_V2__c = :sf_last4SSN AND Id NOT IN :bothMatches];
            System.debug('Accounts matching Last_4_SSN_V2__c only: ' + ssnMatchAccounts.size());
            for (Account acc : ssnMatchAccounts) {
                ssnMatches.add(acc.Id);
            }
        }
        
        // Query for Accounts matching Phone only
        if (String.isNotBlank(searchValue)) {
            System.debug('Querying for accounts matching Phone');
            List<Account> phoneMatchAccounts = [SELECT Id FROM Account WHERE Phone = :searchValue AND Id NOT IN :bothMatches];
            System.debug('Accounts matching Phone only: ' + phoneMatchAccounts.size());
            for (Account acc : phoneMatchAccounts) {
                phoneMatches.add(acc.Id);
            }
        }
        
        // Combine the results in the desired order
        List<String> orderedAccountIds = bothMatches;
        orderedAccountIds.addAll(ssnMatches);
        orderedAccountIds.addAll(phoneMatches);

        System.debug('Ordered Account IDs: ' + orderedAccountIds);

        // If Accounts are found, navigate to the Visualforce page
        if (!orderedAccountIds.isEmpty()) {
            String accountIdsJson = JSON.serialize(orderedAccountIds);
            String vfPageURL = '/apex/VerifyMemberVisualforcePage?ids=' + EncodingUtil.urlEncode(accountIdsJson, 'UTF-8');
            System.debug('Navigating to Visualforce page with URL: ' + vfPageURL);
            
            dataToReturn.put('url', vfPageURL);
            return JSON.serialize(dataToReturn);
        }
        
        // If no specific conditions are met, default to the standard screen pop behavior
        dataToReturn.put('defaultScreenPop', true);
        return JSON.serialize(dataToReturn);
    }
}