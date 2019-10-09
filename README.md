# mock-console-server
EnMasse mock console server that serves a static data-set comprising two namespaces, three address spaces, and many
addresses of different types.

The mock is not yet complete.  Currently following major features are missing:

* address/connections links and their metrics
* sorting
* filter
* mutations for create/patching/deleting addressess spaces and addresses
* mutations for purging an address and closing a connection.


# Running

node mock-console-server.js

Navigate to http://localhost:4000/ to use the GraphQL playground.  This lets you explore the schema and run queries
dynamically.

# Example Queries


## all_address_spaces

```
query all_address_spaces {
  addressSpaces {
    Total
    AddressSpaces {
      Resource {
        Metadata {
          Namespace
          Name
          CreationTimestamp
        }
        Spec {
          Type
          Plan {
            Spec {
              DisplayName
            }
          }
        }
        Status {
          IsReady
          Messages
        }
        
      }
    }
  }
}
```

## all_addresses_for_addressspace_view

```
query all_addresses_for_addressspace_view {
  addresses(namespace: "app1_ns", addressSpace: "jupiter_as1") {
    Total
    Addresses {
      Resource {
        Metadata {
          Namespace
          Name
        }
        Spec {
          Address
          Plan {
            Spec {
              DisplayName
            }
          }
        }
        Status {
          IsReady
          Messages
        }
      }
      Metrics {
        Name
        Type
        Value
        Units
      }
    }
  }
}
```

## all_connections_for_addressspace_view

```
query all_connections_for_addressspace_view {
  connections(namespace: "app1_ns", addressSpace: "jupiter_as1") {
    Total
    Connections {
      Hostname
      ContainerId
      Protocol
      }
    }
  }
}
```


