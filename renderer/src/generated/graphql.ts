import { GraphQLResolveInfo } from 'graphql';
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
};

export type InputLeaderboard = {
  keyboard: Scalars['String']['input'];
  language: Scalars['String']['input'];
  level: Scalars['String']['input'];
};

export type InputResult = {
  correct: Scalars['Int']['input'];
  incorrect: Scalars['Int']['input'];
  keyboard: Scalars['String']['input'];
  language: Scalars['String']['input'];
  level: Scalars['String']['input'];
  time: Scalars['String']['input'];
};

export type InputSettings = {
  analytics: Scalars['Boolean']['input'];
  keyboardName: Scalars['String']['input'];
  language: Scalars['String']['input'];
  levelName: Scalars['String']['input'];
  publishToLeaderboard: Scalars['Boolean']['input'];
  theme: Scalars['String']['input'];
  whatsNewOnStartup: Scalars['Boolean']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addResult: Result;
  removeAllResults: Scalars['Boolean']['output'];
  updateSettings: Settings;
};


export type MutationAddResultArgs = {
  result: InputResult;
};


export type MutationUpdateSettingsArgs = {
  settings: InputSettings;
};

export type Plan = {
  __typename?: 'Plan';
  auto_renew?: Maybe<Scalars['Boolean']['output']>;
  billing_period?: Maybe<Scalars['String']['output']>;
  billing_plan?: Maybe<Scalars['String']['output']>;
  next_billing_date?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  leaderboards: Scores;
  results: Array<Result>;
  settings: Settings;
  subscription: Plan;
};


export type QueryLeaderboardsArgs = {
  leaderboard: InputLeaderboard;
};

export type Result = {
  __typename?: 'Result';
  correct: Scalars['Int']['output'];
  incorrect: Scalars['Int']['output'];
  keyboard: Scalars['String']['output'];
  language: Scalars['String']['output'];
  level: Scalars['String']['output'];
  time: Scalars['String']['output'];
};

export type Scores = {
  __typename?: 'Scores';
  correct: Scalars['Int']['output'];
  incorrect: Scalars['Int']['output'];
  time: Scalars['String']['output'];
  userName: Scalars['String']['output'];
};

export type Settings = {
  __typename?: 'Settings';
  analytics: Scalars['Boolean']['output'];
  keyboardName: Scalars['String']['output'];
  language: Scalars['String']['output'];
  levelName: Scalars['String']['output'];
  publishToLeaderboard: Scalars['Boolean']['output'];
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
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  InputLeaderboard: InputLeaderboard;
  InputResult: InputResult;
  InputSettings: InputSettings;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Plan: ResolverTypeWrapper<Plan>;
  Query: ResolverTypeWrapper<{}>;
  Result: ResolverTypeWrapper<Result>;
  Scores: ResolverTypeWrapper<Scores>;
  Settings: ResolverTypeWrapper<Settings>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  InputLeaderboard: InputLeaderboard;
  InputResult: InputResult;
  InputSettings: InputSettings;
  Int: Scalars['Int']['output'];
  Mutation: {};
  Plan: Plan;
  Query: {};
  Result: Result;
  Scores: Scores;
  Settings: Settings;
  String: Scalars['String']['output'];
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addResult?: Resolver<ResolversTypes['Result'], ParentType, ContextType, RequireFields<MutationAddResultArgs, 'result'>>;
  removeAllResults?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updateSettings?: Resolver<ResolversTypes['Settings'], ParentType, ContextType, RequireFields<MutationUpdateSettingsArgs, 'settings'>>;
};

export type PlanResolvers<ContextType = any, ParentType extends ResolversParentTypes['Plan'] = ResolversParentTypes['Plan']> = {
  auto_renew?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  billing_period?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  billing_plan?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  next_billing_date?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  leaderboards?: Resolver<ResolversTypes['Scores'], ParentType, ContextType, RequireFields<QueryLeaderboardsArgs, 'leaderboard'>>;
  results?: Resolver<Array<ResolversTypes['Result']>, ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['Settings'], ParentType, ContextType>;
  subscription?: Resolver<ResolversTypes['Plan'], ParentType, ContextType>;
};

export type ResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['Result'] = ResolversParentTypes['Result']> = {
  correct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  incorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  keyboard?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  time?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ScoresResolvers<ContextType = any, ParentType extends ResolversParentTypes['Scores'] = ResolversParentTypes['Scores']> = {
  correct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  incorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  time?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettingsResolvers<ContextType = any, ParentType extends ResolversParentTypes['Settings'] = ResolversParentTypes['Settings']> = {
  analytics?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  keyboardName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  levelName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  publishToLeaderboard?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  theme?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  whatsNewOnStartup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  Mutation?: MutationResolvers<ContextType>;
  Plan?: PlanResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Result?: ResultResolvers<ContextType>;
  Scores?: ScoresResolvers<ContextType>;
  Settings?: SettingsResolvers<ContextType>;
};

