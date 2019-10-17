# mock-console-server
EnMasse mock console server that serves a static data-set comprising two namespaces, three address spaces, and many
addresses of different types.

The mock is not yet complete.  Currently following major features are missing:

* sorting
* mutations for purging an address and closing a connection.
* the structure of the object beneath connections and links feels ugly

# Running


`node mock-console-server.js`

Navigate to http://localhost:4000/ to use the GraphQL playground.  This lets you explore the schema and run queries
dynamically.

# Filters

Most queries accept a `filter` argument.  This allows filtering of the results.  The filter is specified by a
SQL-92 style `where` clause.  JSON-path operands are supported thus allowing filtering of any leaf node of the result
object.  A JSON-path operand in the expression are enclosed in backticks.

e.g.

```
 `$.Spec.AddressSpace` = 'jupiter_as1' AND `$.Metadata.Namespace` = 'app1_ns'
```

# Sorting

Most queries accept a `orderBy` argument.  This allows the sorting of the results by one or more fields.
The sort clause is specified by a SQL-92 like `order by` clause with JSON-paths identifying the leaf node in the
result that is to be subjected to the sort.  Sort order can be `ASC` (ascending - default) or `DESC` (descending).

An ascending sort:

```
"`$.Metadata.Name`"
```

Multiple sort clauses are supported. Separate each clause with a comma.

A two clause sort:

```
"`$.Spec.Type` ,`$.Metadata.Name` desc"
```

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
  addresses(filter:"`$.Spec.AddressSpace` = 'jupiter_as1' AND `$.Metadata.Namespace` = 'app1_ns'") {
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
  connections(filter:"`$.AddressSpace.Metadata.Name` = 'jupiter_as1' AND `$.AddressSpace.Metadata.Namespace` = 'app1_ns'") {
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

NOTE: patch operation requires a JSON patch of the resource to be updated. The patch itself
is a stringify JSON list. The mock server currently implements RFC 6902 application/json-patch+json.

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


## Create address

```
mutation create_addr($a:Address_enmasse_io_v1beta1_Input!) {
  createAddress(input: $a) {
    Metadata
    {
      Name
      Namespace
      Uid
    }
  }
}
```

args:

```
{
  "a": { "Metadata": {"Name": "jupiter_as1.wiby1", "Namespace": "app1_ns" },
    "Spec": {"Type": "queue", "Plan": "standard-small-queue", "Address": "wiby1", "AddressSpace": "jupiter_as1"}}
}
```

# Patch address

```
mutation patch_addr(
  $a: ObjectMeta_v1_Input!
  $jsonPatch: String!
  $patchType: String!
) {
  patchAddress(input: $a, jsonPatch: $jsonPatch, patchType: $patchType) {
    Metadata {
      Name
      Namespace
      Uid
      CreationTimestamp
    }
    Spec {
      Type
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
  "a": {"Name": "jupiter_as1.wiby1", "Namespace": "app1_ns" },
"jsonPatch": "[{\"op\":\"replace\",\"path\":\"/Spec/Plan\",\"value\":\"standard-medium-queue\"}]",
  "patchType": "application/json-patch+json"
}
```

# Delete address

```
mutation delete_addr($a:ObjectMeta_v1_Input!) {
  deleteAddress(input:$a)
}
```

args:
```
{
  "a": {"Name": "jupiter_as1.wiby1", "Namespace": "app1_ns" }
}
```
