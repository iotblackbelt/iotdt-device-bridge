# Azure Application Registration and Azure Digital Twin role assignment
This document describes the steps to take to creat an application registration and digital twin role assignment that allows your service app to connect to Azure Digital Twin and read Device data. The procedure consists of the follwing steps:
- Register an Azure Application (service app)
- Retrieve the application object Id
- Assign an Azure Digital Twin role to the application (gateway device)

## Register an Azure Application (service app)
To allow the Azure Digital Twin Device Bridge to connect to Azure Digital Twin and retrieve the connection string for a device, a Azure Application with the correct settings has to be created. Follow these steps to create the application registration:

1. Open Azure portal and browse to the <b>Azure Active Directory</b> blade.
2. Open the <b>Application Registration</b> blade and add a new registration. Give the application registration a logical name (the name will be used to retrieve the object Id).

    ![Add application registration](assets/Appreg_1.png "Add application registration")

3. Once you've registered the application, open the registration and copy the <b>Application (client) ID</b> for later use. Then open the <b>Authentication</b> blade. Select the <b>Access tokens</b> and save the change.

    ![Set authentication](assets/Appreg_2.png "Set authentication")

4. Open the <b>Certificates & secrets</b> blade, create a client secret with the desired expiration, and copy and save the client secret value for later use. This can only be done at creation time. If you forgot to copy the value, you can create a new client secret at any time later.

    ![Create client secret](assets/Appreg_3.png "Create client secret")

5. Open the <b>API Permissions</b> blade and add permissions to read/write the Azure Digital Twin API. Find the API by using the <b>Add a permission</b> button and search the Azure Digital Twins API in the <b>APIs my organization uses</b> tab. 

    ![Find Azure Digital Twin API](assets/Appreg_5.png "Find Azure Digital Twin API")

6. Click on <b>Azure Digital Twins</b>, select the <b>Read.Write</b> permission and click the <b>Add permissions</b> button.

    ![Add permissions](assets/Appreg_6.png "Add permissions")

7. Once back in the <b>API permissions</b> blade, click the <b>Grant admin consent for ...</b> button to ensure consent is given to all users and services connecting.

The steps above have created an Azure Application Registration.

## Retrieve the application object Id
The Azure Active Directory object Id of the aplication will be used to create a role assignment in your Azure Digital Twin instance, so the Azure Digital Twin Device Bridge can connect to your instance to retrieve device connection strings.

Follow these steps to retrieve the <b>object Id</b>

1. Open Azure portal and open the <b>Cloud Shell</b>. Type in the following command:

```
Get-AzureRmADServicePrincipal -DisplayName '<your application registration name>'
```

2. Copy the <b>Id</b> GUID and save it for later use.

    ![Object Id](assets/Appreg_4.png "Object Id")

## Assign an Azure Digital Twin role to the application (gateway device)
To ensure the Azure Digital Twin Device Bridge can access you digital twin instance and retrieve the device conection string, you need to assign the Azure Application the role of gateway device. The easiest way to do this is using the [Azure Digital Twin Graph Viewer](https://github.com/Azure/azure-digital-twins-graph-viewer). Deploy the viewer as a web app or run it locally as a docker container. 

Follow these steps to assign the role:

1. Once you've got the <b>Azure Digital Twin Graph Viewer</b> login to the viewer.

    ![Login to viewer](assets/Appreg_8.png "Login to viewer")

2. Once logged in click on <b>Execute API Call</b>. A slide-in window will appear. Provide the following details:
- API: roleassignments
- Method: POST
- JSON Input:
```json
{
    "roleId": "d4c69766-e9bd-4e61-bfc1-d8b6e686c7a8",
    "objectId": "<your application object Id (retrieved in the previous step)>",
    "objectIdType": "UserId",
    "tenantId": "<your Azure tenant Id>",
    "path": "/"
}
```

3. Click on the <b>Execute</b> button and a <b>Gateway Device</b> role will be assigned to your Azure application. If the role assignment was successful a role assignment Id will be provided in the JSON Output field.

> More information on roles that can be assigned can be found [here](https://docs.microsoft.com/en-us/azure/digital-twins/security-role-based-access-control#role-definitions).