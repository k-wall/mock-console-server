const { gql } = require('apollo-server');

const typeDefs = gql`    
  scalar Date
    
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
  
  enum Protocol {
    amqp,
    amqps
  }

  type Metric {
    Name: String!
    Type: MetricType!
    Value: Float!
    Units: String!
  }

  type Connection {
    AddressSpace: AddressSpace_enmasse_io_v1beta1!,
    Hostname: String!
    ContainerId: String!
    Protocol: Protocol!
    Properties: [KeyValue!]!
    Metrics: [Metric!]!,
    Links: LinkQueryResult!
  }

  type Link {
    Name: String!
    Connection: Connection!
    Address: String!
    Role: LinkRole!
    Metrics: [Metric!]!
  }

  #
  #  Types used to facilitate the paginated model queries
  #

  type AddressSpaceQueryResult {
    Total: Int!
    AddressSpaces: [AddressSpace!]!
  }

  type AddressQueryResult {
    Total: Int!
    Addresses: [Address!]!
  }

  type ConnectionQueryResult {
    Total: Int!
    Connections: [Connection!]!
  }

  type LinkQueryResult {
    Total: Int!
    Links: [Link!]!
  }

  # Wrapper that encapulates the k8s object, metrics and links

  type AddressSpace {
    Resource: AddressSpace_enmasse_io_v1beta1!
    Connections(first: Int, offset: Int): ConnectionQueryResult!
    Metrics: [Metric!]
  }

  type Address {
    Resource: Address_enmasse_io_v1beta1!
    Links(first: Int, offset: Int): LinkQueryResult!
    Metrics: [Metric!]
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
    Type:      AddressSpaceType!
  }

  type AddressSpaceStatus_enmasse_io_v1beta1 {
    IsReady: Boolean!
    Messages: [String!]
  }

  type AddressSpec_enmasse_io_v1beta1 {
    Address:      String!
    AddressSpace: String!
    Type:         AddressType!
    Plan:         AddressPlan_admin_enmasse_io_v1beta2!
    Topic:        String
  }

  type AddressStatus_enmasse_io_v1beta1 {
    IsReady: Boolean!
    Messages: [String!]
  }

  type Address_enmasse_io_v1beta1 {
    Metadata: ObjectMeta_v1!
    Spec: AddressSpec_enmasse_io_v1beta1!
    Status: AddressStatus_enmasse_io_v1beta1
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
    CreationTimestamp: Date!
    Uid: ID!
  }

  type User_v1 {
    Metadata: ObjectMeta_v1!
    Identities: [String!]!
    Groups: [String!]!
  }

  type Namespace_v1 {
    Metadata: ObjectMeta_v1!
    Status: NamespaceStatus_v1!
  }

  type NamespaceStatus_v1 {
    Phase: String!
  }

  type Query {
      hello: String

      "Returns the address spaces type defined by the system"
      addressSpaceTypes: [AddressSpaceType!]!
      "Returns the address spaces plans defined by the system optionally filtereing for a single address space type"
      addressSpacePlans(addressSpaceType: AddressSpaceType): [AddressSpacePlan_admin_enmasse_io_v1beta2!]!

      "Returns the address type defined by the system"
      addressTypes: [AddressType!]!
      "Returns the address plans defined by the system optionally filtering for a single address space plan"
      addressPlans(addressSpacePlan: String): [AddressPlan_admin_enmasse_io_v1beta2!]!

      "Returns the current logged on user"
      whoami: User_v1!
      "Returns the namespaces visible to this user"
      namespaces : [Namespace_v1!]!

      "Returns the address spaces visible to this user,  optionally filtering for a single namespace"
      addressSpaces(namespace: String, first: Int, offset: Int): AddressSpaceQueryResult

      "Returns the addresses visible to this user,  optionally filtering for namespace or namespace/addressspace"
      addresses(namespace: String, addressSpace: String, first: Int, offset: Int): AddressQueryResult

      "Returns the connections visible to this user,  optionally filtering for namespace or namespace/addressspace"
      connections(namespace: String, addressSpace: String, first: Int, offset: Int): ConnectionQueryResult
  }

  #
  # Inputs Types
  #

  input ObjectMeta_v1_Input {
      Name: String!
      Namespace: String!
      ResourceVersion: String
  }

  input AddressSpaceSpec_enmasse_io_v1beta1_Input {
      Type:         String!
      Plan:         String!
  }

  input AddressSpace_enmasse_io_v1beta1_Input {
      Metadata: ObjectMeta_v1_Input
      Spec: AddressSpaceSpec_enmasse_io_v1beta1_Input
  }

  input AddressSpec_enmasse_io_v1beta1_Input {
      Address:      String!
      AddressSpace: String
      Type:         String!
      Plan:         String!
      Topic:        String
  }

  input Address_enmasse_io_v1beta1_Input {
      Metadata: ObjectMeta_v1_Input
      Spec: AddressSpec_enmasse_io_v1beta1_Input
  }

  type Mutation {
      createAddressSpace(input: AddressSpace_enmasse_io_v1beta1_Input!): AddressSpace_enmasse_io_v1beta1!
      deleteAddressSpace(input: ObjectMeta_v1_Input!): Boolean
      createAddress(input: Address_enmasse_io_v1beta1_Input!): Address_enmasse_io_v1beta1!
#      patchAddress(input: ObjectMetaK8sInput!, jsonPatch: String!, patchType : String!): AddressK8s!
#      deleteAddress(input: ObjectMetaK8sInput!): Boolean
  }
`;

module.exports = typeDefs;
