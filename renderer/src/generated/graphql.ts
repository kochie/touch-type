import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AWSDateTime: { input: any; output: any; }
  AWSEmail: { input: any; output: any; }
  AWSIPAddress: { input: any; output: any; }
  AWSJSON: { input: any; output: any; }
  AWSPhone: { input: any; output: any; }
  AWSTime: { input: any; output: any; }
  AWSTimestamp: { input: any; output: any; }
  AWSURL: { input: any; output: any; }
  BigInt: { input: any; output: any; }
  Double: { input: any; output: any; }
};

export type Challenge = {
  __typename?: 'Challenge';
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  keyboard: Scalars['String']['output'];
  level: Scalars['String']['output'];
};

export type Goal = {
  __typename?: 'Goal';
  category: Scalars['String']['output'];
  complete: Scalars['Boolean']['output'];
  description: Scalars['String']['output'];
  keyboard: Scalars['String']['output'];
  language: Scalars['String']['output'];
  level: Scalars['String']['output'];
  requirement: Requirement;
};

export type InputLeaderboard = {
  keyboard?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<Scalars['String']['input']>;
};

export type InputResult = {
  capital: Scalars['Boolean']['input'];
  correct: Scalars['Int']['input'];
  cpm: Scalars['Float']['input'];
  datetime: Scalars['AWSDateTime']['input'];
  incorrect: Scalars['Int']['input'];
  keyPresses: Array<InputMaybe<KeyPressInput>>;
  keyboard: Scalars['String']['input'];
  language: Scalars['String']['input'];
  level: Scalars['String']['input'];
  numbers: Scalars['Boolean']['input'];
  punctuation: Scalars['Boolean']['input'];
  time: Scalars['String']['input'];
};

export type InputSettings = {
  analytics: Scalars['Boolean']['input'];
  blinker: Scalars['Boolean']['input'];
  capital: Scalars['Boolean']['input'];
  keyboardName: Scalars['String']['input'];
  language: Scalars['String']['input'];
  levelName: Scalars['String']['input'];
  numbers: Scalars['Boolean']['input'];
  publishToLeaderboard: Scalars['Boolean']['input'];
  punctuation: Scalars['Boolean']['input'];
  theme: Scalars['String']['input'];
  whatsNewOnStartup: Scalars['Boolean']['input'];
};

export type KeyPress = {
  __typename?: 'KeyPress';
  correct: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  pressedKey?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['Float']['output']>;
};

export type KeyPressInput = {
  correct: Scalars['Boolean']['input'];
  key: Scalars['String']['input'];
  pressedKey?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['Float']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addResult: Result;
  completeChallenge: Challenge;
  completeGoal: Goal;
  newChallenge: Challenge;
  newGoal: Goal;
  removeAllResults: Scalars['Boolean']['output'];
  updateSettings: Settings;
};


export type MutationAddResultArgs = {
  result: InputResult;
};


export type MutationCompleteChallengeArgs = {
  category: Scalars['String']['input'];
};


export type MutationCompleteGoalArgs = {
  category: Scalars['String']['input'];
};


export type MutationNewChallengeArgs = {
  category: Scalars['String']['input'];
};


export type MutationNewGoalArgs = {
  category: Scalars['String']['input'];
};


export type MutationUpdateSettingsArgs = {
  settings: InputSettings;
};

export type PaginatedResults = {
  __typename?: 'PaginatedResults';
  nextToken?: Maybe<Scalars['String']['output']>;
  results: Array<Maybe<Result>>;
};

export type Plan = {
  __typename?: 'Plan';
  auto_renew?: Maybe<Scalars['Boolean']['output']>;
  billing_period?: Maybe<Scalars['String']['output']>;
  billing_plan?: Maybe<Scalars['String']['output']>;
  next_billing_date?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  challenge: Challenge;
  goal: Goal;
  leaderboards: Array<Maybe<Scores>>;
  recommendations: Array<Maybe<Scalars['String']['output']>>;
  results: PaginatedResults;
  settings: Settings;
  subscription: Plan;
};


export type QueryChallengeArgs = {
  category: Scalars['String']['input'];
};


export type QueryGoalArgs = {
  category: Scalars['String']['input'];
};


export type QueryLeaderboardsArgs = {
  leaderboard?: InputMaybe<InputLeaderboard>;
};


export type QueryRecommendationsArgs = {
  category: Scalars['String']['input'];
};


export type QueryResultsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
  since?: InputMaybe<Scalars['AWSDateTime']['input']>;
};

export type Requirement = {
  __typename?: 'Requirement';
  capital?: Maybe<Scalars['Boolean']['output']>;
  correct?: Maybe<Scalars['Int']['output']>;
  cpm?: Maybe<Scalars['Float']['output']>;
  incorrect?: Maybe<Scalars['Int']['output']>;
  numbers?: Maybe<Scalars['Boolean']['output']>;
  punctuation?: Maybe<Scalars['Boolean']['output']>;
  score?: Maybe<Scalars['Int']['output']>;
  time?: Maybe<Scalars['Int']['output']>;
};

export type Result = {
  __typename?: 'Result';
  capital: Scalars['Boolean']['output'];
  correct: Scalars['Int']['output'];
  cpm: Scalars['Float']['output'];
  datetime: Scalars['AWSDateTime']['output'];
  incorrect: Scalars['Int']['output'];
  keyPresses: Array<Maybe<KeyPress>>;
  keyboard: Scalars['String']['output'];
  language: Scalars['String']['output'];
  level: Scalars['String']['output'];
  numbers: Scalars['Boolean']['output'];
  punctuation: Scalars['Boolean']['output'];
  time: Scalars['String']['output'];
};

export type Scores = {
  __typename?: 'Scores';
  capital: Scalars['Boolean']['output'];
  correct: Scalars['Int']['output'];
  cpm: Scalars['Float']['output'];
  datetime: Scalars['AWSDateTime']['output'];
  incorrect: Scalars['Int']['output'];
  keyboard: Scalars['String']['output'];
  level: Scalars['String']['output'];
  numbers: Scalars['Boolean']['output'];
  punctuation: Scalars['Boolean']['output'];
  time: Scalars['Int']['output'];
  username: Scalars['String']['output'];
};

export type Settings = {
  __typename?: 'Settings';
  analytics: Scalars['Boolean']['output'];
  blinker: Scalars['Boolean']['output'];
  capital: Scalars['Boolean']['output'];
  keyboardName: Scalars['String']['output'];
  language: Scalars['String']['output'];
  levelName: Scalars['String']['output'];
  numbers: Scalars['Boolean']['output'];
  publishToLeaderboard: Scalars['Boolean']['output'];
  punctuation: Scalars['Boolean']['output'];
  theme: Scalars['String']['output'];
  whatsNewOnStartup: Scalars['Boolean']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AWSDateTime: ResolverTypeWrapper<Scalars['AWSDateTime']['output']>;
  AWSEmail: ResolverTypeWrapper<Scalars['AWSEmail']['output']>;
  AWSIPAddress: ResolverTypeWrapper<Scalars['AWSIPAddress']['output']>;
  AWSJSON: ResolverTypeWrapper<Scalars['AWSJSON']['output']>;
  AWSPhone: ResolverTypeWrapper<Scalars['AWSPhone']['output']>;
  AWSTime: ResolverTypeWrapper<Scalars['AWSTime']['output']>;
  AWSTimestamp: ResolverTypeWrapper<Scalars['AWSTimestamp']['output']>;
  AWSURL: ResolverTypeWrapper<Scalars['AWSURL']['output']>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Challenge: ResolverTypeWrapper<Challenge>;
  Double: ResolverTypeWrapper<Scalars['Double']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Goal: ResolverTypeWrapper<Goal>;
  InputLeaderboard: InputLeaderboard;
  InputResult: InputResult;
  InputSettings: InputSettings;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  KeyPress: ResolverTypeWrapper<KeyPress>;
  KeyPressInput: KeyPressInput;
  Mutation: ResolverTypeWrapper<{}>;
  PaginatedResults: ResolverTypeWrapper<PaginatedResults>;
  Plan: ResolverTypeWrapper<Plan>;
  Query: ResolverTypeWrapper<{}>;
  Requirement: ResolverTypeWrapper<Requirement>;
  Result: ResolverTypeWrapper<Result>;
  Scores: ResolverTypeWrapper<Scores>;
  Settings: ResolverTypeWrapper<Settings>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AWSDateTime: Scalars['AWSDateTime']['output'];
  AWSEmail: Scalars['AWSEmail']['output'];
  AWSIPAddress: Scalars['AWSIPAddress']['output'];
  AWSJSON: Scalars['AWSJSON']['output'];
  AWSPhone: Scalars['AWSPhone']['output'];
  AWSTime: Scalars['AWSTime']['output'];
  AWSTimestamp: Scalars['AWSTimestamp']['output'];
  AWSURL: Scalars['AWSURL']['output'];
  BigInt: Scalars['BigInt']['output'];
  Boolean: Scalars['Boolean']['output'];
  Challenge: Challenge;
  Double: Scalars['Double']['output'];
  Float: Scalars['Float']['output'];
  Goal: Goal;
  InputLeaderboard: InputLeaderboard;
  InputResult: InputResult;
  InputSettings: InputSettings;
  Int: Scalars['Int']['output'];
  KeyPress: KeyPress;
  KeyPressInput: KeyPressInput;
  Mutation: {};
  PaginatedResults: PaginatedResults;
  Plan: Plan;
  Query: {};
  Requirement: Requirement;
  Result: Result;
  Scores: Scores;
  Settings: Settings;
  String: Scalars['String']['output'];
};

export type Aws_Api_KeyDirectiveArgs = { };

export type Aws_Api_KeyDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_Api_KeyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_AuthDirectiveArgs = {
  cognito_groups: Array<Scalars['String']['input']>;
};

export type Aws_AuthDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_AuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_Cognito_User_PoolsDirectiveArgs = {
  cognito_groups?: Maybe<Array<Scalars['String']['input']>>;
};

export type Aws_Cognito_User_PoolsDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_Cognito_User_PoolsDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_IamDirectiveArgs = { };

export type Aws_IamDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_IamDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_OidcDirectiveArgs = { };

export type Aws_OidcDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_OidcDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_SubscribeDirectiveArgs = {
  mutations: Array<Scalars['String']['input']>;
};

export type Aws_SubscribeDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_SubscribeDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export interface AwsDateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSDateTime'], any> {
  name: 'AWSDateTime';
}

export interface AwsEmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSEmail'], any> {
  name: 'AWSEmail';
}

export interface AwsipAddressScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSIPAddress'], any> {
  name: 'AWSIPAddress';
}

export interface AwsjsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSJSON'], any> {
  name: 'AWSJSON';
}

export interface AwsPhoneScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSPhone'], any> {
  name: 'AWSPhone';
}

export interface AwsTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSTime'], any> {
  name: 'AWSTime';
}

export interface AwsTimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSTimestamp'], any> {
  name: 'AWSTimestamp';
}

export interface AwsurlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSURL'], any> {
  name: 'AWSURL';
}

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type ChallengeResolvers<ContextType = any, ParentType extends ResolversParentTypes['Challenge'] = ResolversParentTypes['Challenge']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  keyboard?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DoubleScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Double'], any> {
  name: 'Double';
}

export type GoalResolvers<ContextType = any, ParentType extends ResolversParentTypes['Goal'] = ResolversParentTypes['Goal']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  complete?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  keyboard?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requirement?: Resolver<ResolversTypes['Requirement'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type KeyPressResolvers<ContextType = any, ParentType extends ResolversParentTypes['KeyPress'] = ResolversParentTypes['KeyPress']> = {
  correct?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pressedKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addResult?: Resolver<ResolversTypes['Result'], ParentType, ContextType, RequireFields<MutationAddResultArgs, 'result'>>;
  completeChallenge?: Resolver<ResolversTypes['Challenge'], ParentType, ContextType, RequireFields<MutationCompleteChallengeArgs, 'category'>>;
  completeGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationCompleteGoalArgs, 'category'>>;
  newChallenge?: Resolver<ResolversTypes['Challenge'], ParentType, ContextType, RequireFields<MutationNewChallengeArgs, 'category'>>;
  newGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationNewGoalArgs, 'category'>>;
  removeAllResults?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updateSettings?: Resolver<ResolversTypes['Settings'], ParentType, ContextType, RequireFields<MutationUpdateSettingsArgs, 'settings'>>;
};

export type PaginatedResultsResolvers<ContextType = any, ParentType extends ResolversParentTypes['PaginatedResults'] = ResolversParentTypes['PaginatedResults']> = {
  nextToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  results?: Resolver<Array<Maybe<ResolversTypes['Result']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PlanResolvers<ContextType = any, ParentType extends ResolversParentTypes['Plan'] = ResolversParentTypes['Plan']> = {
  auto_renew?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  billing_period?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  billing_plan?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  next_billing_date?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  challenge?: Resolver<ResolversTypes['Challenge'], ParentType, ContextType, RequireFields<QueryChallengeArgs, 'category'>>;
  goal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<QueryGoalArgs, 'category'>>;
  leaderboards?: Resolver<Array<Maybe<ResolversTypes['Scores']>>, ParentType, ContextType, Partial<QueryLeaderboardsArgs>>;
  recommendations?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType, RequireFields<QueryRecommendationsArgs, 'category'>>;
  results?: Resolver<ResolversTypes['PaginatedResults'], ParentType, ContextType, Partial<QueryResultsArgs>>;
  settings?: Resolver<ResolversTypes['Settings'], ParentType, ContextType>;
  subscription?: Resolver<ResolversTypes['Plan'], ParentType, ContextType>;
};

export type RequirementResolvers<ContextType = any, ParentType extends ResolversParentTypes['Requirement'] = ResolversParentTypes['Requirement']> = {
  capital?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  correct?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cpm?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  incorrect?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  numbers?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  punctuation?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  time?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['Result'] = ResolversParentTypes['Result']> = {
  capital?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  correct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  cpm?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  datetime?: Resolver<ResolversTypes['AWSDateTime'], ParentType, ContextType>;
  incorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  keyPresses?: Resolver<Array<Maybe<ResolversTypes['KeyPress']>>, ParentType, ContextType>;
  keyboard?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  numbers?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  punctuation?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  time?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ScoresResolvers<ContextType = any, ParentType extends ResolversParentTypes['Scores'] = ResolversParentTypes['Scores']> = {
  capital?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  correct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  cpm?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  datetime?: Resolver<ResolversTypes['AWSDateTime'], ParentType, ContextType>;
  incorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  keyboard?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  numbers?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  punctuation?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  time?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettingsResolvers<ContextType = any, ParentType extends ResolversParentTypes['Settings'] = ResolversParentTypes['Settings']> = {
  analytics?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blinker?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  capital?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  keyboardName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  levelName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  numbers?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  publishToLeaderboard?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  punctuation?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  theme?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  whatsNewOnStartup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AWSDateTime?: GraphQLScalarType;
  AWSEmail?: GraphQLScalarType;
  AWSIPAddress?: GraphQLScalarType;
  AWSJSON?: GraphQLScalarType;
  AWSPhone?: GraphQLScalarType;
  AWSTime?: GraphQLScalarType;
  AWSTimestamp?: GraphQLScalarType;
  AWSURL?: GraphQLScalarType;
  BigInt?: GraphQLScalarType;
  Challenge?: ChallengeResolvers<ContextType>;
  Double?: GraphQLScalarType;
  Goal?: GoalResolvers<ContextType>;
  KeyPress?: KeyPressResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PaginatedResults?: PaginatedResultsResolvers<ContextType>;
  Plan?: PlanResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Requirement?: RequirementResolvers<ContextType>;
  Result?: ResultResolvers<ContextType>;
  Scores?: ScoresResolvers<ContextType>;
  Settings?: SettingsResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = any> = {
  aws_api_key?: Aws_Api_KeyDirectiveResolver<any, any, ContextType>;
  aws_auth?: Aws_AuthDirectiveResolver<any, any, ContextType>;
  aws_cognito_user_pools?: Aws_Cognito_User_PoolsDirectiveResolver<any, any, ContextType>;
  aws_iam?: Aws_IamDirectiveResolver<any, any, ContextType>;
  aws_oidc?: Aws_OidcDirectiveResolver<any, any, ContextType>;
  aws_subscribe?: Aws_SubscribeDirectiveResolver<any, any, ContextType>;
};
