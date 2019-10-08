const { gql } = require('apollo-server');

const typeDefs = gql`

  type KeyValue {
    Key: String!
    Value: String!
  }

  enum AddressType {
    queue
    topic
    subscription
    multicast
    anycast
  }

  enum LinkRole {
    sender,
    receiver
  }

  enum MetricType {
    gauge
    counter
    rate
  }

  
  type Metric {
    Name: String!
    Type: MetricType!
    Value: Float!
    Units: String
  }

  
  type Connection {
    hostname: String!
    containerId: String!
    protocol: String
    properties: [KeyValue!]!
  }

  type Link {
    Name: String!
    Connection: Connection!
    Address: String!
    Role: LinkRole!
    Metrics: [Metric!]
  }

  #
  #  Types used to facilitate the paginated model queries
  #

  type AddressQueryResult {
    Total: Int!
    Addresess: [Address!]!
  }

  type LinkQueryResult {
    Total: Int!
    Links: [Link!]!
  }

  # Wrapper that encapulates the k8s object, metrics and links
  type Address {
    Resource: AddressK8s!
    Links: [Link!]
    Metrics: [Metric!]
    # Non root query faciliating pagination within this address's link(s).
    queryLinks(first: Int, offset: Int): LinkQueryResult!
  }

  type AddressSpecK8s {
    Address:      String!
    AddressSpace: String!
    Type:         AddressType!
    Plan:         AddressPlanK8s!
    Topic:        String
  }

  type AddressStatusK8s {
    IsReady: Boolean!
    Messages: [String!]
  }

  type AddressK8s {
    ObjectMeta: ObjectMeta_v1!
    Spec: AddressSpecK8s!
    Status: AddressStatusK8s
  }

  type AddressPlanSpecK8s {
    AddressType: AddressType!
    DisplayName: String!
    LongDescription: String!
    ShortDescription: String!
    DisplayOrder: Int!
  }

  type AddressPlanK8s {
    ObjectMeta: ObjectMeta_v1!
    Spec: AddressPlanSpecK8s!
  }



  #
  # Mirrors of Kubernetes types.  These follow the names and structure of the underlying
  # Kubernetes object exactly.  We don't need to expose every field, just the ones that
  # are important to the GraphQL interface.
  #
  # It is also possible to map types into GraphQL types (enums, other types etc) as is
  # done below for the address.spec.plan and type fields.
  #

  type ObjectMeta_v1 {
    Annotations: [KeyValue!]!
    Name: String!
    Namespace: String!
    ResourceVersion: String!
    CreationTimestamp: String!
  }
  
  type User_v1 {
    ObjectMeta: ObjectMeta_v1!
    Identities: [String!]!
    Groups: [String!]!
  }

  type Query {
    hello: String
    "Returns the current logged on user"
    whoami: User_v1!
      
      
  }


`;

module.exports = typeDefs;
