@description('The location of the resources.')
param location string = 'germanywestcentral'

@description('The location specifically for the PostgreSQL database due to quota constraints in some regions.')
param dbLocation string = 'norwayeast'

@description('Prefix for naming resources to ensure uniqueness')
param resourcePrefix string = 'znbp'

@description('Administrator login name for the PostgreSQL server')
param dbAdminUser string = 'postgres'

@description('Administrator login password for the PostgreSQL server')
@secure()
param dbAdminPassword string

@description('Django Secret Key')
@secure()
param djangoSecretKey string

@description('The tier for the App Service Plan')
param appServicePlanTier string = 'B1'

// --- PostgreSQL Flexible Server ---
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${resourcePrefix}-pg-${uniqueString(resourceGroup().id)}'
  location: dbLocation
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: 32
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgresServer
  name: 'AllowAllAzureIPs'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgresServer
  name: 'z_nbp'
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// --- Azure Cache for Redis ---
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${resourcePrefix}-redis-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0 // C0 tier, approx 250MB, lowest tier
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// --- App Service Plan & Web App (Backend) ---
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${resourcePrefix}-asp'
  location: location
  kind: 'linux'
  sku: {
    name: appServicePlanTier
  }
  properties: {
    reserved: true
  }
}

resource backendWebApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${resourcePrefix}-backend-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'app,linux'
  dependsOn: [
    postgresDb
  ]
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.13'
      appCommandLine: 'export PYTHONPATH=".:$PYTHONPATH" && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --timeout 600'
      appSettings: [
        {
          name: 'POST_BUILD_COMMAND'
          value: 'export PYTHONPATH=".:$PYTHONPATH" && python manage.py migrate --noinput && python manage.py collectstatic --noinput --clear'
        }
        {
          name: 'WEBSITES_PORT'
          value: '8000'
        }
        {
          name: 'DB_HOST'
          value: postgresServer.properties.fullyQualifiedDomainName
        }
        {
          name: 'DB_NAME'
          value: 'z_nbp'
        }
        {
          name: 'DB_USER'
          value: dbAdminUser
        }
        {
          name: 'DB_PASSWORD'
          value: dbAdminPassword
        }
        {
          name: 'DATABASE_URL'
          value: 'postgres://${dbAdminUser}:${dbAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/z_nbp'
        }
        {
          name: 'REDIS_URL'
          value: 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:${redisCache.properties.sslPort}/1'
        }
        {
          name: 'DJANGO_SECRET_KEY'
          value: djangoSecretKey
        }
        {
          name: 'DEBUG'
          value: 'False'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITES_CONTAINER_START_TIME_LIMIT'
          value: '1800'
        }
        {
          name: 'ALLOWED_HOSTS'
          value: '*'
        }
        {
          name: 'CORS_ALLOW_ALL_ORIGINS'
          value: 'False'
        }
        {
          name: 'FRONTEND_URL'
          value: frontendStorage.properties.primaryEndpoints.web
        }
      ]
    }
  }
}

// --- Azure Storage Account (Frontend Static Website) ---
resource frontendStorage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: take('${replace(resourcePrefix, '-', '')}${uniqueString(resourceGroup().id)}', 24)
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
  }
}

output backendAppName string = backendWebApp.name
output backendUrl string = backendWebApp.properties.defaultHostName
output frontendStorageAccountName string = frontendStorage.name
output frontendUrl string = frontendStorage.properties.primaryEndpoints.web
