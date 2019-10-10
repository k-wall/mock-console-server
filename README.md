# mock-console-server
EnMasse mock console server that serves a static data-set comprising two namespaces, three address spaces, and many
addresses of different types.

The mock is not yet complete.  Currently following major features are missing:

* sorting
* filtering
* mutations for create/patching/deleting addressess spaces and addresses
* mutations for purging an address and closing a connection.


# Running


`node mock-console-server.js`

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


# Example Mutations

## Create address space

```
mutation create_as($a:AddressSpace_enmasse_io_v1beta1_Input!) {
  createAddressSpace(input:$a) {
    Metadata {
      Name
      CreationTimestamp
      Uid
    }
    Spec {
      Plan {
        Metadata {
          Name
        }
      }
    }
  }
}
```

args:

```
{
  "a": { "Metadata": {"Name": "wibx", "Namespace": "app1_ns" },
    "Spec": {"Type": "standard", "Plan": "standard-small"}}
}
```

## Patch address space

```
mutation patch_as(
  $a: ObjectMeta_v1_Input!
  $jsonPatch: String!
  $patchType: String!
) {
  patchAddressSpace(input: $a, jsonPatch: $jsonPatch, patchType: $patchType) {
    Metadata {
      Name
      Uid
    }
    Spec {
      Plan {
        Metadata {
          Name
        }
      }
    }
  }
}
```

args: 

```
{
  "a": {"Name": "wibx", "Namespace": "app1_ns" },
"jsonPatch": "[{\"op\":\"replace\",\"path\":\"/Spec/Plan\",\"value\":\"standard-medium\"}]",
  "patchType": "application/json-patch+json"
  

}
```


## Delete address space


```
mutation delete_as($a:ObjectMeta_v1_Input!) {
  deleteAddressSpace(input:$a)
}
```

args:

```
{
  "a": {"Name": "wibx", "Namespace": "app1_ns" }
}
```