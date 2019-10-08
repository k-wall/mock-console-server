const { gql } = require('apollo-server');

const typeDefs = gql`

  type KeyValue {
    Key: String!
    Value: String!
  }

  enum AddressSpaceType {
    standard
    brokered
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

  type AddressSpace {
      Resource: AddressSpace_enmasse_io_v1beta1!
      Connections: [Connection!]!
      Metrics: [Metric!]
  }

  type Address {
    Resource: AddressK8s!
    Links: [Link!]
    Metrics: [Metric!]
    # Non root query faciliating pagination within this address's link(s).
    queryLinks(first: Int, offset: Int): LinkQueryResult!
  }

  #
  # Mirrors of Kubernetes types.  These follow the names and structure of the underlying
  # Kubernetes object exactly.  We don't need to expose every field, just the ones that
  # are important to the GraphQL interface.
  #
  # It is also possible to map types into GraphQL types (enums, other types etc) as is
  # done below for the address.spec.plan and type fields.
  #

  type AddressSpace_enmasse_io_v1beta1 {
      Metadata: ObjectMeta_v1!
      Spec: AddressSpaceSpec_enmasse_io_v1beta1!
      Status: AddressSpaceStatus_enmasse_io_v1beta1
  }

  type AddressSpaceSpec_enmasse_io_v1beta1 {
      Plan:      AddressSpacePlan_admin_enmasse_io_v1beta2!
      Type:         AddressSpaceType!
  }

  type AddressSpaceStatus_enmasse_io_v1beta1 {
      IsReady: Boolean!
      Messages: [String!]
  }

  

  type AddressSpecK8s {
    Address:      String!
    AddressSpace: String!
    Type:         AddressType!
    Plan:         AddressPlan_admin_enmasse_io_v1beta2!
    Topic:        String
  }

  type AddressStatusK8s {
    IsReady: Boolean!
    Messages: [String!]
  }

  type AddressK8s {
    Metadata: ObjectMeta_v1!
    Spec: AddressSpecK8s!
    Status: AddressStatusK8s
  }

  type AddressPlan_admin_enmasse_io_v1beta2 {
      Metadata: ObjectMeta_v1!
      Spec: AddressPlanSpec_admin_enmasse_io_v1beta2!
  }

  type AddressPlanSpec_admin_enmasse_io_v1beta2 {
      AddressType: AddressType!
      DisplayName: String!
      LongDescription: String!
      ShortDescription: String!
      DisplayOrder: Int!
  }

  type AddressSpacePlan_admin_enmasse_io_v1beta2 {
      Metadata: ObjectMeta_v1!
      Spec: AddressSpacePlanSpec_admin_enmasse_io_v1beta2!
  }

  type AddressSpacePlanSpec_admin_enmasse_io_v1beta2 {
      AddressPlans: [AddressSpacePlan_admin_enmasse_io_v1beta2!]!
      AddressSpaceType: AddressSpaceType,
      DisplayName: String!
      LongDescription: String!
      ShortDescription: String!
      DisplayOrder: Int!
  }


  type ObjectMeta_v1 {
    Annotations: [KeyValue!]!
    Name: String!
    Namespace: String!
    ResourceVersion: String!
    CreationTimestamp: String!
  }
  
  type User_v1 {
    Metadata: ObjectMeta_v1!
    Identities: [String!]!
    Groups: [String!]!
  }

  type Query {
    hello: String
    "Returns the current logged on user"
    whoami: User_v1!
      addressSpaceTypes: [AddressSpaceType!]!
      addressSpacePlans(addressSpaceType: AddressSpaceType): [AddressSpacePlan_admin_enmasse_io_v1beta2!]!
      
      addressTypes: [AddressType!]!
      addressPlans(addressSpacePlan: String): [AddressPlan_admin_enmasse_io_v1beta2!]!
      
      
  }


`;

module.exports = typeDefs;
