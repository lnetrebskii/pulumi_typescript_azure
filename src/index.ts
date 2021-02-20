import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { AzureFunction, Context } from "@azure/functions"

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup(`stella-to-client-portal-integration-${pulumi.getStack()}`);

// Create an Azure resource (Storage Account)
const account = new azure.storage.Account("storage", {
    // The location for the storage account will be derived automatically from the resource group.
    resourceGroupName: resourceGroup.name,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

const serviceBus = new azure.servicebus.Namespace(`client-portal-db-servicebus-${pulumi.getStack()}`, {
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    sku: "Basic",
});

const entitiesQueue = new azure.servicebus.Queue("entitiesQueue", {
    resourceGroupName: resourceGroup.name,
    namespaceName: serviceBus.name,
    enablePartitioning: true
});

const funcAppInsights = new azure.appinsights.Insights(`entitiesPersister-${pulumi.getStack()}`, {
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    applicationType: "Node.JS",
});
export const instrumentationKey = funcAppInsights.instrumentationKey;
export const appId = funcAppInsights.appId;

const handler = function(context: Context, crmContext: any) 
{

}

const eventFunction = entitiesQueue.getEventFunction('entitiesPersister', handler);

const appservicePlan = new azure.appservice.Plan(`entitiesPersisterApp-${pulumi.getStack()}`, {
    resourceGroupName: resourceGroup.name,
    sku: 
    { 
        tier: "Dynamic", 
        size: "Y1" 
    },
});

const app = new azure.appservice.MultiCallbackFunctionApp(`entitiesPersisterApp-${pulumi.getStack()}`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    functions: [eventFunction],
    plan: appservicePlan,
    account: account,
    osType: "linux",
    appSettings: {
        'APPINSIGHTS_INSTRUMENTATIONKEY': instrumentationKey
    }
 });

// Export the connection string for the storage account
export const connectionString = account.primaryConnectionString;