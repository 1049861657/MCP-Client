
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Setting
 * 
 */
export type Setting = $Result.DefaultSelection<Prisma.$SettingPayload>
/**
 * Model AIProvider
 * 
 */
export type AIProvider = $Result.DefaultSelection<Prisma.$AIProviderPayload>
/**
 * Model AIModel
 * 
 */
export type AIModel = $Result.DefaultSelection<Prisma.$AIModelPayload>
/**
 * Model MCPServer
 * 
 */
export type MCPServer = $Result.DefaultSelection<Prisma.$MCPServerPayload>
/**
 * Model QuickMessage
 * 
 */
export type QuickMessage = $Result.DefaultSelection<Prisma.$QuickMessagePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ProviderType: {
  OPENAI: 'OPENAI'
};

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType]


export const ConnectionType: {
  STDIO: 'STDIO',
  SSE: 'SSE'
};

export type ConnectionType = (typeof ConnectionType)[keyof typeof ConnectionType]

}

export type ProviderType = $Enums.ProviderType

export const ProviderType: typeof $Enums.ProviderType

export type ConnectionType = $Enums.ConnectionType

export const ConnectionType: typeof $Enums.ConnectionType

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Settings
 * const settings = await prisma.setting.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Settings
   * const settings = await prisma.setting.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.setting`: Exposes CRUD operations for the **Setting** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Settings
    * const settings = await prisma.setting.findMany()
    * ```
    */
  get setting(): Prisma.SettingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aIProvider`: Exposes CRUD operations for the **AIProvider** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AIProviders
    * const aIProviders = await prisma.aIProvider.findMany()
    * ```
    */
  get aIProvider(): Prisma.AIProviderDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aIModel`: Exposes CRUD operations for the **AIModel** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AIModels
    * const aIModels = await prisma.aIModel.findMany()
    * ```
    */
  get aIModel(): Prisma.AIModelDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.mCPServer`: Exposes CRUD operations for the **MCPServer** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MCPServers
    * const mCPServers = await prisma.mCPServer.findMany()
    * ```
    */
  get mCPServer(): Prisma.MCPServerDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.quickMessage`: Exposes CRUD operations for the **QuickMessage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more QuickMessages
    * const quickMessages = await prisma.quickMessage.findMany()
    * ```
    */
  get quickMessage(): Prisma.QuickMessageDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.6.0
   * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Setting: 'Setting',
    AIProvider: 'AIProvider',
    AIModel: 'AIModel',
    MCPServer: 'MCPServer',
    QuickMessage: 'QuickMessage'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "setting" | "aIProvider" | "aIModel" | "mCPServer" | "quickMessage"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Setting: {
        payload: Prisma.$SettingPayload<ExtArgs>
        fields: Prisma.SettingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SettingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SettingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          findFirst: {
            args: Prisma.SettingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SettingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          findMany: {
            args: Prisma.SettingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          create: {
            args: Prisma.SettingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          createMany: {
            args: Prisma.SettingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SettingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          delete: {
            args: Prisma.SettingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          update: {
            args: Prisma.SettingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          deleteMany: {
            args: Prisma.SettingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SettingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SettingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          upsert: {
            args: Prisma.SettingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          aggregate: {
            args: Prisma.SettingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSetting>
          }
          groupBy: {
            args: Prisma.SettingGroupByArgs<ExtArgs>
            result: $Utils.Optional<SettingGroupByOutputType>[]
          }
          count: {
            args: Prisma.SettingCountArgs<ExtArgs>
            result: $Utils.Optional<SettingCountAggregateOutputType> | number
          }
        }
      }
      AIProvider: {
        payload: Prisma.$AIProviderPayload<ExtArgs>
        fields: Prisma.AIProviderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AIProviderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AIProviderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>
          }
          findFirst: {
            args: Prisma.AIProviderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AIProviderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>
          }
          findMany: {
            args: Prisma.AIProviderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>[]
          }
          create: {
            args: Prisma.AIProviderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>
          }
          createMany: {
            args: Prisma.AIProviderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AIProviderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>[]
          }
          delete: {
            args: Prisma.AIProviderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>
          }
          update: {
            args: Prisma.AIProviderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>
          }
          deleteMany: {
            args: Prisma.AIProviderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AIProviderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AIProviderUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>[]
          }
          upsert: {
            args: Prisma.AIProviderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIProviderPayload>
          }
          aggregate: {
            args: Prisma.AIProviderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAIProvider>
          }
          groupBy: {
            args: Prisma.AIProviderGroupByArgs<ExtArgs>
            result: $Utils.Optional<AIProviderGroupByOutputType>[]
          }
          count: {
            args: Prisma.AIProviderCountArgs<ExtArgs>
            result: $Utils.Optional<AIProviderCountAggregateOutputType> | number
          }
        }
      }
      AIModel: {
        payload: Prisma.$AIModelPayload<ExtArgs>
        fields: Prisma.AIModelFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AIModelFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AIModelFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>
          }
          findFirst: {
            args: Prisma.AIModelFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AIModelFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>
          }
          findMany: {
            args: Prisma.AIModelFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>[]
          }
          create: {
            args: Prisma.AIModelCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>
          }
          createMany: {
            args: Prisma.AIModelCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AIModelCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>[]
          }
          delete: {
            args: Prisma.AIModelDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>
          }
          update: {
            args: Prisma.AIModelUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>
          }
          deleteMany: {
            args: Prisma.AIModelDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AIModelUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AIModelUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>[]
          }
          upsert: {
            args: Prisma.AIModelUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIModelPayload>
          }
          aggregate: {
            args: Prisma.AIModelAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAIModel>
          }
          groupBy: {
            args: Prisma.AIModelGroupByArgs<ExtArgs>
            result: $Utils.Optional<AIModelGroupByOutputType>[]
          }
          count: {
            args: Prisma.AIModelCountArgs<ExtArgs>
            result: $Utils.Optional<AIModelCountAggregateOutputType> | number
          }
        }
      }
      MCPServer: {
        payload: Prisma.$MCPServerPayload<ExtArgs>
        fields: Prisma.MCPServerFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MCPServerFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MCPServerFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>
          }
          findFirst: {
            args: Prisma.MCPServerFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MCPServerFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>
          }
          findMany: {
            args: Prisma.MCPServerFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>[]
          }
          create: {
            args: Prisma.MCPServerCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>
          }
          createMany: {
            args: Prisma.MCPServerCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MCPServerCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>[]
          }
          delete: {
            args: Prisma.MCPServerDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>
          }
          update: {
            args: Prisma.MCPServerUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>
          }
          deleteMany: {
            args: Prisma.MCPServerDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MCPServerUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MCPServerUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>[]
          }
          upsert: {
            args: Prisma.MCPServerUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MCPServerPayload>
          }
          aggregate: {
            args: Prisma.MCPServerAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMCPServer>
          }
          groupBy: {
            args: Prisma.MCPServerGroupByArgs<ExtArgs>
            result: $Utils.Optional<MCPServerGroupByOutputType>[]
          }
          count: {
            args: Prisma.MCPServerCountArgs<ExtArgs>
            result: $Utils.Optional<MCPServerCountAggregateOutputType> | number
          }
        }
      }
      QuickMessage: {
        payload: Prisma.$QuickMessagePayload<ExtArgs>
        fields: Prisma.QuickMessageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.QuickMessageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.QuickMessageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>
          }
          findFirst: {
            args: Prisma.QuickMessageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.QuickMessageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>
          }
          findMany: {
            args: Prisma.QuickMessageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>[]
          }
          create: {
            args: Prisma.QuickMessageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>
          }
          createMany: {
            args: Prisma.QuickMessageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.QuickMessageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>[]
          }
          delete: {
            args: Prisma.QuickMessageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>
          }
          update: {
            args: Prisma.QuickMessageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>
          }
          deleteMany: {
            args: Prisma.QuickMessageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.QuickMessageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.QuickMessageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>[]
          }
          upsert: {
            args: Prisma.QuickMessageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuickMessagePayload>
          }
          aggregate: {
            args: Prisma.QuickMessageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateQuickMessage>
          }
          groupBy: {
            args: Prisma.QuickMessageGroupByArgs<ExtArgs>
            result: $Utils.Optional<QuickMessageGroupByOutputType>[]
          }
          count: {
            args: Prisma.QuickMessageCountArgs<ExtArgs>
            result: $Utils.Optional<QuickMessageCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    setting?: SettingOmit
    aIProvider?: AIProviderOmit
    aIModel?: AIModelOmit
    mCPServer?: MCPServerOmit
    quickMessage?: QuickMessageOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type AIProviderCountOutputType
   */

  export type AIProviderCountOutputType = {
    models: number
  }

  export type AIProviderCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    models?: boolean | AIProviderCountOutputTypeCountModelsArgs
  }

  // Custom InputTypes
  /**
   * AIProviderCountOutputType without action
   */
  export type AIProviderCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProviderCountOutputType
     */
    select?: AIProviderCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AIProviderCountOutputType without action
   */
  export type AIProviderCountOutputTypeCountModelsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIModelWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Setting
   */

  export type AggregateSetting = {
    _count: SettingCountAggregateOutputType | null
    _min: SettingMinAggregateOutputType | null
    _max: SettingMaxAggregateOutputType | null
  }

  export type SettingMinAggregateOutputType = {
    key: string | null
  }

  export type SettingMaxAggregateOutputType = {
    key: string | null
  }

  export type SettingCountAggregateOutputType = {
    key: number
    value: number
    _all: number
  }


  export type SettingMinAggregateInputType = {
    key?: true
  }

  export type SettingMaxAggregateInputType = {
    key?: true
  }

  export type SettingCountAggregateInputType = {
    key?: true
    value?: true
    _all?: true
  }

  export type SettingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Setting to aggregate.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Settings
    **/
    _count?: true | SettingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SettingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SettingMaxAggregateInputType
  }

  export type GetSettingAggregateType<T extends SettingAggregateArgs> = {
        [P in keyof T & keyof AggregateSetting]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSetting[P]>
      : GetScalarType<T[P], AggregateSetting[P]>
  }




  export type SettingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SettingWhereInput
    orderBy?: SettingOrderByWithAggregationInput | SettingOrderByWithAggregationInput[]
    by: SettingScalarFieldEnum[] | SettingScalarFieldEnum
    having?: SettingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SettingCountAggregateInputType | true
    _min?: SettingMinAggregateInputType
    _max?: SettingMaxAggregateInputType
  }

  export type SettingGroupByOutputType = {
    key: string
    value: JsonValue
    _count: SettingCountAggregateOutputType | null
    _min: SettingMinAggregateOutputType | null
    _max: SettingMaxAggregateOutputType | null
  }

  type GetSettingGroupByPayload<T extends SettingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SettingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SettingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SettingGroupByOutputType[P]>
            : GetScalarType<T[P], SettingGroupByOutputType[P]>
        }
      >
    >


  export type SettingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectScalar = {
    key?: boolean
    value?: boolean
  }

  export type SettingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"key" | "value", ExtArgs["result"]["setting"]>

  export type $SettingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Setting"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: Prisma.JsonValue
    }, ExtArgs["result"]["setting"]>
    composites: {}
  }

  type SettingGetPayload<S extends boolean | null | undefined | SettingDefaultArgs> = $Result.GetResult<Prisma.$SettingPayload, S>

  type SettingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SettingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SettingCountAggregateInputType | true
    }

  export interface SettingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Setting'], meta: { name: 'Setting' } }
    /**
     * Find zero or one Setting that matches the filter.
     * @param {SettingFindUniqueArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SettingFindUniqueArgs>(args: SelectSubset<T, SettingFindUniqueArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Setting that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SettingFindUniqueOrThrowArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SettingFindUniqueOrThrowArgs>(args: SelectSubset<T, SettingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Setting that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindFirstArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SettingFindFirstArgs>(args?: SelectSubset<T, SettingFindFirstArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Setting that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindFirstOrThrowArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SettingFindFirstOrThrowArgs>(args?: SelectSubset<T, SettingFindFirstOrThrowArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Settings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Settings
     * const settings = await prisma.setting.findMany()
     * 
     * // Get first 10 Settings
     * const settings = await prisma.setting.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const settingWithKeyOnly = await prisma.setting.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends SettingFindManyArgs>(args?: SelectSubset<T, SettingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Setting.
     * @param {SettingCreateArgs} args - Arguments to create a Setting.
     * @example
     * // Create one Setting
     * const Setting = await prisma.setting.create({
     *   data: {
     *     // ... data to create a Setting
     *   }
     * })
     * 
     */
    create<T extends SettingCreateArgs>(args: SelectSubset<T, SettingCreateArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Settings.
     * @param {SettingCreateManyArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const setting = await prisma.setting.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SettingCreateManyArgs>(args?: SelectSubset<T, SettingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Settings and returns the data saved in the database.
     * @param {SettingCreateManyAndReturnArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const setting = await prisma.setting.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Settings and only return the `key`
     * const settingWithKeyOnly = await prisma.setting.createManyAndReturn({
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SettingCreateManyAndReturnArgs>(args?: SelectSubset<T, SettingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Setting.
     * @param {SettingDeleteArgs} args - Arguments to delete one Setting.
     * @example
     * // Delete one Setting
     * const Setting = await prisma.setting.delete({
     *   where: {
     *     // ... filter to delete one Setting
     *   }
     * })
     * 
     */
    delete<T extends SettingDeleteArgs>(args: SelectSubset<T, SettingDeleteArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Setting.
     * @param {SettingUpdateArgs} args - Arguments to update one Setting.
     * @example
     * // Update one Setting
     * const setting = await prisma.setting.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SettingUpdateArgs>(args: SelectSubset<T, SettingUpdateArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Settings.
     * @param {SettingDeleteManyArgs} args - Arguments to filter Settings to delete.
     * @example
     * // Delete a few Settings
     * const { count } = await prisma.setting.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SettingDeleteManyArgs>(args?: SelectSubset<T, SettingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Settings
     * const setting = await prisma.setting.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SettingUpdateManyArgs>(args: SelectSubset<T, SettingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings and returns the data updated in the database.
     * @param {SettingUpdateManyAndReturnArgs} args - Arguments to update many Settings.
     * @example
     * // Update many Settings
     * const setting = await prisma.setting.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Settings and only return the `key`
     * const settingWithKeyOnly = await prisma.setting.updateManyAndReturn({
     *   select: { key: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SettingUpdateManyAndReturnArgs>(args: SelectSubset<T, SettingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Setting.
     * @param {SettingUpsertArgs} args - Arguments to update or create a Setting.
     * @example
     * // Update or create a Setting
     * const setting = await prisma.setting.upsert({
     *   create: {
     *     // ... data to create a Setting
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Setting we want to update
     *   }
     * })
     */
    upsert<T extends SettingUpsertArgs>(args: SelectSubset<T, SettingUpsertArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingCountArgs} args - Arguments to filter Settings to count.
     * @example
     * // Count the number of Settings
     * const count = await prisma.setting.count({
     *   where: {
     *     // ... the filter for the Settings we want to count
     *   }
     * })
    **/
    count<T extends SettingCountArgs>(
      args?: Subset<T, SettingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SettingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Setting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SettingAggregateArgs>(args: Subset<T, SettingAggregateArgs>): Prisma.PrismaPromise<GetSettingAggregateType<T>>

    /**
     * Group by Setting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SettingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SettingGroupByArgs['orderBy'] }
        : { orderBy?: SettingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SettingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSettingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Setting model
   */
  readonly fields: SettingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Setting.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SettingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Setting model
   */
  interface SettingFieldRefs {
    readonly key: FieldRef<"Setting", 'String'>
    readonly value: FieldRef<"Setting", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * Setting findUnique
   */
  export type SettingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting findUniqueOrThrow
   */
  export type SettingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting findFirst
   */
  export type SettingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting findFirstOrThrow
   */
  export type SettingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting findMany
   */
  export type SettingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting create
   */
  export type SettingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data needed to create a Setting.
     */
    data: XOR<SettingCreateInput, SettingUncheckedCreateInput>
  }

  /**
   * Setting createMany
   */
  export type SettingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Settings.
     */
    data: SettingCreateManyInput | SettingCreateManyInput[]
  }

  /**
   * Setting createManyAndReturn
   */
  export type SettingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data used to create many Settings.
     */
    data: SettingCreateManyInput | SettingCreateManyInput[]
  }

  /**
   * Setting update
   */
  export type SettingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data needed to update a Setting.
     */
    data: XOR<SettingUpdateInput, SettingUncheckedUpdateInput>
    /**
     * Choose, which Setting to update.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting updateMany
   */
  export type SettingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingUpdateManyMutationInput, SettingUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Setting updateManyAndReturn
   */
  export type SettingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingUpdateManyMutationInput, SettingUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Setting upsert
   */
  export type SettingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The filter to search for the Setting to update in case it exists.
     */
    where: SettingWhereUniqueInput
    /**
     * In case the Setting found by the `where` argument doesn't exist, create a new Setting with this data.
     */
    create: XOR<SettingCreateInput, SettingUncheckedCreateInput>
    /**
     * In case the Setting was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SettingUpdateInput, SettingUncheckedUpdateInput>
  }

  /**
   * Setting delete
   */
  export type SettingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter which Setting to delete.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting deleteMany
   */
  export type SettingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Settings to delete
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to delete.
     */
    limit?: number
  }

  /**
   * Setting without action
   */
  export type SettingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
  }


  /**
   * Model AIProvider
   */

  export type AggregateAIProvider = {
    _count: AIProviderCountAggregateOutputType | null
    _min: AIProviderMinAggregateOutputType | null
    _max: AIProviderMaxAggregateOutputType | null
  }

  export type AIProviderMinAggregateOutputType = {
    id: string | null
    name: string | null
    type: $Enums.ProviderType | null
    apiUrl: string | null
    apiKey: string | null
    defaultModelValue: string | null
  }

  export type AIProviderMaxAggregateOutputType = {
    id: string | null
    name: string | null
    type: $Enums.ProviderType | null
    apiUrl: string | null
    apiKey: string | null
    defaultModelValue: string | null
  }

  export type AIProviderCountAggregateOutputType = {
    id: number
    name: number
    type: number
    apiUrl: number
    apiKey: number
    defaultModelValue: number
    _all: number
  }


  export type AIProviderMinAggregateInputType = {
    id?: true
    name?: true
    type?: true
    apiUrl?: true
    apiKey?: true
    defaultModelValue?: true
  }

  export type AIProviderMaxAggregateInputType = {
    id?: true
    name?: true
    type?: true
    apiUrl?: true
    apiKey?: true
    defaultModelValue?: true
  }

  export type AIProviderCountAggregateInputType = {
    id?: true
    name?: true
    type?: true
    apiUrl?: true
    apiKey?: true
    defaultModelValue?: true
    _all?: true
  }

  export type AIProviderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIProvider to aggregate.
     */
    where?: AIProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIProviders to fetch.
     */
    orderBy?: AIProviderOrderByWithRelationInput | AIProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AIProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIProviders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AIProviders
    **/
    _count?: true | AIProviderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AIProviderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AIProviderMaxAggregateInputType
  }

  export type GetAIProviderAggregateType<T extends AIProviderAggregateArgs> = {
        [P in keyof T & keyof AggregateAIProvider]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAIProvider[P]>
      : GetScalarType<T[P], AggregateAIProvider[P]>
  }




  export type AIProviderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIProviderWhereInput
    orderBy?: AIProviderOrderByWithAggregationInput | AIProviderOrderByWithAggregationInput[]
    by: AIProviderScalarFieldEnum[] | AIProviderScalarFieldEnum
    having?: AIProviderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AIProviderCountAggregateInputType | true
    _min?: AIProviderMinAggregateInputType
    _max?: AIProviderMaxAggregateInputType
  }

  export type AIProviderGroupByOutputType = {
    id: string
    name: string
    type: $Enums.ProviderType
    apiUrl: string
    apiKey: string
    defaultModelValue: string
    _count: AIProviderCountAggregateOutputType | null
    _min: AIProviderMinAggregateOutputType | null
    _max: AIProviderMaxAggregateOutputType | null
  }

  type GetAIProviderGroupByPayload<T extends AIProviderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AIProviderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AIProviderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AIProviderGroupByOutputType[P]>
            : GetScalarType<T[P], AIProviderGroupByOutputType[P]>
        }
      >
    >


  export type AIProviderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    type?: boolean
    apiUrl?: boolean
    apiKey?: boolean
    defaultModelValue?: boolean
    models?: boolean | AIProvider$modelsArgs<ExtArgs>
    _count?: boolean | AIProviderCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIProvider"]>

  export type AIProviderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    type?: boolean
    apiUrl?: boolean
    apiKey?: boolean
    defaultModelValue?: boolean
  }, ExtArgs["result"]["aIProvider"]>

  export type AIProviderSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    type?: boolean
    apiUrl?: boolean
    apiKey?: boolean
    defaultModelValue?: boolean
  }, ExtArgs["result"]["aIProvider"]>

  export type AIProviderSelectScalar = {
    id?: boolean
    name?: boolean
    type?: boolean
    apiUrl?: boolean
    apiKey?: boolean
    defaultModelValue?: boolean
  }

  export type AIProviderOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "type" | "apiUrl" | "apiKey" | "defaultModelValue", ExtArgs["result"]["aIProvider"]>
  export type AIProviderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    models?: boolean | AIProvider$modelsArgs<ExtArgs>
    _count?: boolean | AIProviderCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AIProviderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type AIProviderIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $AIProviderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AIProvider"
    objects: {
      models: Prisma.$AIModelPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      type: $Enums.ProviderType
      apiUrl: string
      apiKey: string
      defaultModelValue: string
    }, ExtArgs["result"]["aIProvider"]>
    composites: {}
  }

  type AIProviderGetPayload<S extends boolean | null | undefined | AIProviderDefaultArgs> = $Result.GetResult<Prisma.$AIProviderPayload, S>

  type AIProviderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AIProviderFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AIProviderCountAggregateInputType | true
    }

  export interface AIProviderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AIProvider'], meta: { name: 'AIProvider' } }
    /**
     * Find zero or one AIProvider that matches the filter.
     * @param {AIProviderFindUniqueArgs} args - Arguments to find a AIProvider
     * @example
     * // Get one AIProvider
     * const aIProvider = await prisma.aIProvider.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AIProviderFindUniqueArgs>(args: SelectSubset<T, AIProviderFindUniqueArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AIProvider that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AIProviderFindUniqueOrThrowArgs} args - Arguments to find a AIProvider
     * @example
     * // Get one AIProvider
     * const aIProvider = await prisma.aIProvider.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AIProviderFindUniqueOrThrowArgs>(args: SelectSubset<T, AIProviderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIProvider that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIProviderFindFirstArgs} args - Arguments to find a AIProvider
     * @example
     * // Get one AIProvider
     * const aIProvider = await prisma.aIProvider.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AIProviderFindFirstArgs>(args?: SelectSubset<T, AIProviderFindFirstArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIProvider that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIProviderFindFirstOrThrowArgs} args - Arguments to find a AIProvider
     * @example
     * // Get one AIProvider
     * const aIProvider = await prisma.aIProvider.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AIProviderFindFirstOrThrowArgs>(args?: SelectSubset<T, AIProviderFindFirstOrThrowArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AIProviders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIProviderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AIProviders
     * const aIProviders = await prisma.aIProvider.findMany()
     * 
     * // Get first 10 AIProviders
     * const aIProviders = await prisma.aIProvider.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aIProviderWithIdOnly = await prisma.aIProvider.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AIProviderFindManyArgs>(args?: SelectSubset<T, AIProviderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AIProvider.
     * @param {AIProviderCreateArgs} args - Arguments to create a AIProvider.
     * @example
     * // Create one AIProvider
     * const AIProvider = await prisma.aIProvider.create({
     *   data: {
     *     // ... data to create a AIProvider
     *   }
     * })
     * 
     */
    create<T extends AIProviderCreateArgs>(args: SelectSubset<T, AIProviderCreateArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AIProviders.
     * @param {AIProviderCreateManyArgs} args - Arguments to create many AIProviders.
     * @example
     * // Create many AIProviders
     * const aIProvider = await prisma.aIProvider.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AIProviderCreateManyArgs>(args?: SelectSubset<T, AIProviderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AIProviders and returns the data saved in the database.
     * @param {AIProviderCreateManyAndReturnArgs} args - Arguments to create many AIProviders.
     * @example
     * // Create many AIProviders
     * const aIProvider = await prisma.aIProvider.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AIProviders and only return the `id`
     * const aIProviderWithIdOnly = await prisma.aIProvider.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AIProviderCreateManyAndReturnArgs>(args?: SelectSubset<T, AIProviderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AIProvider.
     * @param {AIProviderDeleteArgs} args - Arguments to delete one AIProvider.
     * @example
     * // Delete one AIProvider
     * const AIProvider = await prisma.aIProvider.delete({
     *   where: {
     *     // ... filter to delete one AIProvider
     *   }
     * })
     * 
     */
    delete<T extends AIProviderDeleteArgs>(args: SelectSubset<T, AIProviderDeleteArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AIProvider.
     * @param {AIProviderUpdateArgs} args - Arguments to update one AIProvider.
     * @example
     * // Update one AIProvider
     * const aIProvider = await prisma.aIProvider.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AIProviderUpdateArgs>(args: SelectSubset<T, AIProviderUpdateArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AIProviders.
     * @param {AIProviderDeleteManyArgs} args - Arguments to filter AIProviders to delete.
     * @example
     * // Delete a few AIProviders
     * const { count } = await prisma.aIProvider.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AIProviderDeleteManyArgs>(args?: SelectSubset<T, AIProviderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIProviders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIProviderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AIProviders
     * const aIProvider = await prisma.aIProvider.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AIProviderUpdateManyArgs>(args: SelectSubset<T, AIProviderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIProviders and returns the data updated in the database.
     * @param {AIProviderUpdateManyAndReturnArgs} args - Arguments to update many AIProviders.
     * @example
     * // Update many AIProviders
     * const aIProvider = await prisma.aIProvider.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AIProviders and only return the `id`
     * const aIProviderWithIdOnly = await prisma.aIProvider.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AIProviderUpdateManyAndReturnArgs>(args: SelectSubset<T, AIProviderUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AIProvider.
     * @param {AIProviderUpsertArgs} args - Arguments to update or create a AIProvider.
     * @example
     * // Update or create a AIProvider
     * const aIProvider = await prisma.aIProvider.upsert({
     *   create: {
     *     // ... data to create a AIProvider
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AIProvider we want to update
     *   }
     * })
     */
    upsert<T extends AIProviderUpsertArgs>(args: SelectSubset<T, AIProviderUpsertArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AIProviders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIProviderCountArgs} args - Arguments to filter AIProviders to count.
     * @example
     * // Count the number of AIProviders
     * const count = await prisma.aIProvider.count({
     *   where: {
     *     // ... the filter for the AIProviders we want to count
     *   }
     * })
    **/
    count<T extends AIProviderCountArgs>(
      args?: Subset<T, AIProviderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AIProviderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AIProvider.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIProviderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AIProviderAggregateArgs>(args: Subset<T, AIProviderAggregateArgs>): Prisma.PrismaPromise<GetAIProviderAggregateType<T>>

    /**
     * Group by AIProvider.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIProviderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AIProviderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AIProviderGroupByArgs['orderBy'] }
        : { orderBy?: AIProviderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AIProviderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAIProviderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AIProvider model
   */
  readonly fields: AIProviderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AIProvider.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AIProviderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    models<T extends AIProvider$modelsArgs<ExtArgs> = {}>(args?: Subset<T, AIProvider$modelsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AIProvider model
   */
  interface AIProviderFieldRefs {
    readonly id: FieldRef<"AIProvider", 'String'>
    readonly name: FieldRef<"AIProvider", 'String'>
    readonly type: FieldRef<"AIProvider", 'ProviderType'>
    readonly apiUrl: FieldRef<"AIProvider", 'String'>
    readonly apiKey: FieldRef<"AIProvider", 'String'>
    readonly defaultModelValue: FieldRef<"AIProvider", 'String'>
  }
    

  // Custom InputTypes
  /**
   * AIProvider findUnique
   */
  export type AIProviderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * Filter, which AIProvider to fetch.
     */
    where: AIProviderWhereUniqueInput
  }

  /**
   * AIProvider findUniqueOrThrow
   */
  export type AIProviderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * Filter, which AIProvider to fetch.
     */
    where: AIProviderWhereUniqueInput
  }

  /**
   * AIProvider findFirst
   */
  export type AIProviderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * Filter, which AIProvider to fetch.
     */
    where?: AIProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIProviders to fetch.
     */
    orderBy?: AIProviderOrderByWithRelationInput | AIProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIProviders.
     */
    cursor?: AIProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIProviders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIProviders.
     */
    distinct?: AIProviderScalarFieldEnum | AIProviderScalarFieldEnum[]
  }

  /**
   * AIProvider findFirstOrThrow
   */
  export type AIProviderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * Filter, which AIProvider to fetch.
     */
    where?: AIProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIProviders to fetch.
     */
    orderBy?: AIProviderOrderByWithRelationInput | AIProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIProviders.
     */
    cursor?: AIProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIProviders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIProviders.
     */
    distinct?: AIProviderScalarFieldEnum | AIProviderScalarFieldEnum[]
  }

  /**
   * AIProvider findMany
   */
  export type AIProviderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * Filter, which AIProviders to fetch.
     */
    where?: AIProviderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIProviders to fetch.
     */
    orderBy?: AIProviderOrderByWithRelationInput | AIProviderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AIProviders.
     */
    cursor?: AIProviderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIProviders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIProviders.
     */
    skip?: number
    distinct?: AIProviderScalarFieldEnum | AIProviderScalarFieldEnum[]
  }

  /**
   * AIProvider create
   */
  export type AIProviderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * The data needed to create a AIProvider.
     */
    data: XOR<AIProviderCreateInput, AIProviderUncheckedCreateInput>
  }

  /**
   * AIProvider createMany
   */
  export type AIProviderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AIProviders.
     */
    data: AIProviderCreateManyInput | AIProviderCreateManyInput[]
  }

  /**
   * AIProvider createManyAndReturn
   */
  export type AIProviderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * The data used to create many AIProviders.
     */
    data: AIProviderCreateManyInput | AIProviderCreateManyInput[]
  }

  /**
   * AIProvider update
   */
  export type AIProviderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * The data needed to update a AIProvider.
     */
    data: XOR<AIProviderUpdateInput, AIProviderUncheckedUpdateInput>
    /**
     * Choose, which AIProvider to update.
     */
    where: AIProviderWhereUniqueInput
  }

  /**
   * AIProvider updateMany
   */
  export type AIProviderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AIProviders.
     */
    data: XOR<AIProviderUpdateManyMutationInput, AIProviderUncheckedUpdateManyInput>
    /**
     * Filter which AIProviders to update
     */
    where?: AIProviderWhereInput
    /**
     * Limit how many AIProviders to update.
     */
    limit?: number
  }

  /**
   * AIProvider updateManyAndReturn
   */
  export type AIProviderUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * The data used to update AIProviders.
     */
    data: XOR<AIProviderUpdateManyMutationInput, AIProviderUncheckedUpdateManyInput>
    /**
     * Filter which AIProviders to update
     */
    where?: AIProviderWhereInput
    /**
     * Limit how many AIProviders to update.
     */
    limit?: number
  }

  /**
   * AIProvider upsert
   */
  export type AIProviderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * The filter to search for the AIProvider to update in case it exists.
     */
    where: AIProviderWhereUniqueInput
    /**
     * In case the AIProvider found by the `where` argument doesn't exist, create a new AIProvider with this data.
     */
    create: XOR<AIProviderCreateInput, AIProviderUncheckedCreateInput>
    /**
     * In case the AIProvider was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AIProviderUpdateInput, AIProviderUncheckedUpdateInput>
  }

  /**
   * AIProvider delete
   */
  export type AIProviderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
    /**
     * Filter which AIProvider to delete.
     */
    where: AIProviderWhereUniqueInput
  }

  /**
   * AIProvider deleteMany
   */
  export type AIProviderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIProviders to delete
     */
    where?: AIProviderWhereInput
    /**
     * Limit how many AIProviders to delete.
     */
    limit?: number
  }

  /**
   * AIProvider.models
   */
  export type AIProvider$modelsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    where?: AIModelWhereInput
    orderBy?: AIModelOrderByWithRelationInput | AIModelOrderByWithRelationInput[]
    cursor?: AIModelWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AIModelScalarFieldEnum | AIModelScalarFieldEnum[]
  }

  /**
   * AIProvider without action
   */
  export type AIProviderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIProvider
     */
    select?: AIProviderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIProvider
     */
    omit?: AIProviderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIProviderInclude<ExtArgs> | null
  }


  /**
   * Model AIModel
   */

  export type AggregateAIModel = {
    _count: AIModelCountAggregateOutputType | null
    _min: AIModelMinAggregateOutputType | null
    _max: AIModelMaxAggregateOutputType | null
  }

  export type AIModelMinAggregateOutputType = {
    id: string | null
    value: string | null
    label: string | null
    providerId: string | null
  }

  export type AIModelMaxAggregateOutputType = {
    id: string | null
    value: string | null
    label: string | null
    providerId: string | null
  }

  export type AIModelCountAggregateOutputType = {
    id: number
    value: number
    label: number
    providerId: number
    _all: number
  }


  export type AIModelMinAggregateInputType = {
    id?: true
    value?: true
    label?: true
    providerId?: true
  }

  export type AIModelMaxAggregateInputType = {
    id?: true
    value?: true
    label?: true
    providerId?: true
  }

  export type AIModelCountAggregateInputType = {
    id?: true
    value?: true
    label?: true
    providerId?: true
    _all?: true
  }

  export type AIModelAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIModel to aggregate.
     */
    where?: AIModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIModels to fetch.
     */
    orderBy?: AIModelOrderByWithRelationInput | AIModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AIModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIModels.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AIModels
    **/
    _count?: true | AIModelCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AIModelMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AIModelMaxAggregateInputType
  }

  export type GetAIModelAggregateType<T extends AIModelAggregateArgs> = {
        [P in keyof T & keyof AggregateAIModel]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAIModel[P]>
      : GetScalarType<T[P], AggregateAIModel[P]>
  }




  export type AIModelGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIModelWhereInput
    orderBy?: AIModelOrderByWithAggregationInput | AIModelOrderByWithAggregationInput[]
    by: AIModelScalarFieldEnum[] | AIModelScalarFieldEnum
    having?: AIModelScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AIModelCountAggregateInputType | true
    _min?: AIModelMinAggregateInputType
    _max?: AIModelMaxAggregateInputType
  }

  export type AIModelGroupByOutputType = {
    id: string
    value: string
    label: string
    providerId: string
    _count: AIModelCountAggregateOutputType | null
    _min: AIModelMinAggregateOutputType | null
    _max: AIModelMaxAggregateOutputType | null
  }

  type GetAIModelGroupByPayload<T extends AIModelGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AIModelGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AIModelGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AIModelGroupByOutputType[P]>
            : GetScalarType<T[P], AIModelGroupByOutputType[P]>
        }
      >
    >


  export type AIModelSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    value?: boolean
    label?: boolean
    providerId?: boolean
    provider?: boolean | AIProviderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIModel"]>

  export type AIModelSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    value?: boolean
    label?: boolean
    providerId?: boolean
    provider?: boolean | AIProviderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIModel"]>

  export type AIModelSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    value?: boolean
    label?: boolean
    providerId?: boolean
    provider?: boolean | AIProviderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIModel"]>

  export type AIModelSelectScalar = {
    id?: boolean
    value?: boolean
    label?: boolean
    providerId?: boolean
  }

  export type AIModelOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "value" | "label" | "providerId", ExtArgs["result"]["aIModel"]>
  export type AIModelInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | AIProviderDefaultArgs<ExtArgs>
  }
  export type AIModelIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | AIProviderDefaultArgs<ExtArgs>
  }
  export type AIModelIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    provider?: boolean | AIProviderDefaultArgs<ExtArgs>
  }

  export type $AIModelPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AIModel"
    objects: {
      provider: Prisma.$AIProviderPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      value: string
      label: string
      providerId: string
    }, ExtArgs["result"]["aIModel"]>
    composites: {}
  }

  type AIModelGetPayload<S extends boolean | null | undefined | AIModelDefaultArgs> = $Result.GetResult<Prisma.$AIModelPayload, S>

  type AIModelCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AIModelFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AIModelCountAggregateInputType | true
    }

  export interface AIModelDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AIModel'], meta: { name: 'AIModel' } }
    /**
     * Find zero or one AIModel that matches the filter.
     * @param {AIModelFindUniqueArgs} args - Arguments to find a AIModel
     * @example
     * // Get one AIModel
     * const aIModel = await prisma.aIModel.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AIModelFindUniqueArgs>(args: SelectSubset<T, AIModelFindUniqueArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AIModel that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AIModelFindUniqueOrThrowArgs} args - Arguments to find a AIModel
     * @example
     * // Get one AIModel
     * const aIModel = await prisma.aIModel.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AIModelFindUniqueOrThrowArgs>(args: SelectSubset<T, AIModelFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIModel that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIModelFindFirstArgs} args - Arguments to find a AIModel
     * @example
     * // Get one AIModel
     * const aIModel = await prisma.aIModel.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AIModelFindFirstArgs>(args?: SelectSubset<T, AIModelFindFirstArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIModel that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIModelFindFirstOrThrowArgs} args - Arguments to find a AIModel
     * @example
     * // Get one AIModel
     * const aIModel = await prisma.aIModel.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AIModelFindFirstOrThrowArgs>(args?: SelectSubset<T, AIModelFindFirstOrThrowArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AIModels that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIModelFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AIModels
     * const aIModels = await prisma.aIModel.findMany()
     * 
     * // Get first 10 AIModels
     * const aIModels = await prisma.aIModel.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aIModelWithIdOnly = await prisma.aIModel.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AIModelFindManyArgs>(args?: SelectSubset<T, AIModelFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AIModel.
     * @param {AIModelCreateArgs} args - Arguments to create a AIModel.
     * @example
     * // Create one AIModel
     * const AIModel = await prisma.aIModel.create({
     *   data: {
     *     // ... data to create a AIModel
     *   }
     * })
     * 
     */
    create<T extends AIModelCreateArgs>(args: SelectSubset<T, AIModelCreateArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AIModels.
     * @param {AIModelCreateManyArgs} args - Arguments to create many AIModels.
     * @example
     * // Create many AIModels
     * const aIModel = await prisma.aIModel.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AIModelCreateManyArgs>(args?: SelectSubset<T, AIModelCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AIModels and returns the data saved in the database.
     * @param {AIModelCreateManyAndReturnArgs} args - Arguments to create many AIModels.
     * @example
     * // Create many AIModels
     * const aIModel = await prisma.aIModel.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AIModels and only return the `id`
     * const aIModelWithIdOnly = await prisma.aIModel.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AIModelCreateManyAndReturnArgs>(args?: SelectSubset<T, AIModelCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AIModel.
     * @param {AIModelDeleteArgs} args - Arguments to delete one AIModel.
     * @example
     * // Delete one AIModel
     * const AIModel = await prisma.aIModel.delete({
     *   where: {
     *     // ... filter to delete one AIModel
     *   }
     * })
     * 
     */
    delete<T extends AIModelDeleteArgs>(args: SelectSubset<T, AIModelDeleteArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AIModel.
     * @param {AIModelUpdateArgs} args - Arguments to update one AIModel.
     * @example
     * // Update one AIModel
     * const aIModel = await prisma.aIModel.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AIModelUpdateArgs>(args: SelectSubset<T, AIModelUpdateArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AIModels.
     * @param {AIModelDeleteManyArgs} args - Arguments to filter AIModels to delete.
     * @example
     * // Delete a few AIModels
     * const { count } = await prisma.aIModel.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AIModelDeleteManyArgs>(args?: SelectSubset<T, AIModelDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIModels.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIModelUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AIModels
     * const aIModel = await prisma.aIModel.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AIModelUpdateManyArgs>(args: SelectSubset<T, AIModelUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIModels and returns the data updated in the database.
     * @param {AIModelUpdateManyAndReturnArgs} args - Arguments to update many AIModels.
     * @example
     * // Update many AIModels
     * const aIModel = await prisma.aIModel.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AIModels and only return the `id`
     * const aIModelWithIdOnly = await prisma.aIModel.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AIModelUpdateManyAndReturnArgs>(args: SelectSubset<T, AIModelUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AIModel.
     * @param {AIModelUpsertArgs} args - Arguments to update or create a AIModel.
     * @example
     * // Update or create a AIModel
     * const aIModel = await prisma.aIModel.upsert({
     *   create: {
     *     // ... data to create a AIModel
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AIModel we want to update
     *   }
     * })
     */
    upsert<T extends AIModelUpsertArgs>(args: SelectSubset<T, AIModelUpsertArgs<ExtArgs>>): Prisma__AIModelClient<$Result.GetResult<Prisma.$AIModelPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AIModels.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIModelCountArgs} args - Arguments to filter AIModels to count.
     * @example
     * // Count the number of AIModels
     * const count = await prisma.aIModel.count({
     *   where: {
     *     // ... the filter for the AIModels we want to count
     *   }
     * })
    **/
    count<T extends AIModelCountArgs>(
      args?: Subset<T, AIModelCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AIModelCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AIModel.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIModelAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AIModelAggregateArgs>(args: Subset<T, AIModelAggregateArgs>): Prisma.PrismaPromise<GetAIModelAggregateType<T>>

    /**
     * Group by AIModel.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIModelGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AIModelGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AIModelGroupByArgs['orderBy'] }
        : { orderBy?: AIModelGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AIModelGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAIModelGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AIModel model
   */
  readonly fields: AIModelFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AIModel.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AIModelClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    provider<T extends AIProviderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AIProviderDefaultArgs<ExtArgs>>): Prisma__AIProviderClient<$Result.GetResult<Prisma.$AIProviderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AIModel model
   */
  interface AIModelFieldRefs {
    readonly id: FieldRef<"AIModel", 'String'>
    readonly value: FieldRef<"AIModel", 'String'>
    readonly label: FieldRef<"AIModel", 'String'>
    readonly providerId: FieldRef<"AIModel", 'String'>
  }
    

  // Custom InputTypes
  /**
   * AIModel findUnique
   */
  export type AIModelFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * Filter, which AIModel to fetch.
     */
    where: AIModelWhereUniqueInput
  }

  /**
   * AIModel findUniqueOrThrow
   */
  export type AIModelFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * Filter, which AIModel to fetch.
     */
    where: AIModelWhereUniqueInput
  }

  /**
   * AIModel findFirst
   */
  export type AIModelFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * Filter, which AIModel to fetch.
     */
    where?: AIModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIModels to fetch.
     */
    orderBy?: AIModelOrderByWithRelationInput | AIModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIModels.
     */
    cursor?: AIModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIModels.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIModels.
     */
    distinct?: AIModelScalarFieldEnum | AIModelScalarFieldEnum[]
  }

  /**
   * AIModel findFirstOrThrow
   */
  export type AIModelFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * Filter, which AIModel to fetch.
     */
    where?: AIModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIModels to fetch.
     */
    orderBy?: AIModelOrderByWithRelationInput | AIModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIModels.
     */
    cursor?: AIModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIModels.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIModels.
     */
    distinct?: AIModelScalarFieldEnum | AIModelScalarFieldEnum[]
  }

  /**
   * AIModel findMany
   */
  export type AIModelFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * Filter, which AIModels to fetch.
     */
    where?: AIModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIModels to fetch.
     */
    orderBy?: AIModelOrderByWithRelationInput | AIModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AIModels.
     */
    cursor?: AIModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIModels.
     */
    skip?: number
    distinct?: AIModelScalarFieldEnum | AIModelScalarFieldEnum[]
  }

  /**
   * AIModel create
   */
  export type AIModelCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * The data needed to create a AIModel.
     */
    data: XOR<AIModelCreateInput, AIModelUncheckedCreateInput>
  }

  /**
   * AIModel createMany
   */
  export type AIModelCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AIModels.
     */
    data: AIModelCreateManyInput | AIModelCreateManyInput[]
  }

  /**
   * AIModel createManyAndReturn
   */
  export type AIModelCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * The data used to create many AIModels.
     */
    data: AIModelCreateManyInput | AIModelCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIModel update
   */
  export type AIModelUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * The data needed to update a AIModel.
     */
    data: XOR<AIModelUpdateInput, AIModelUncheckedUpdateInput>
    /**
     * Choose, which AIModel to update.
     */
    where: AIModelWhereUniqueInput
  }

  /**
   * AIModel updateMany
   */
  export type AIModelUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AIModels.
     */
    data: XOR<AIModelUpdateManyMutationInput, AIModelUncheckedUpdateManyInput>
    /**
     * Filter which AIModels to update
     */
    where?: AIModelWhereInput
    /**
     * Limit how many AIModels to update.
     */
    limit?: number
  }

  /**
   * AIModel updateManyAndReturn
   */
  export type AIModelUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * The data used to update AIModels.
     */
    data: XOR<AIModelUpdateManyMutationInput, AIModelUncheckedUpdateManyInput>
    /**
     * Filter which AIModels to update
     */
    where?: AIModelWhereInput
    /**
     * Limit how many AIModels to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIModel upsert
   */
  export type AIModelUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * The filter to search for the AIModel to update in case it exists.
     */
    where: AIModelWhereUniqueInput
    /**
     * In case the AIModel found by the `where` argument doesn't exist, create a new AIModel with this data.
     */
    create: XOR<AIModelCreateInput, AIModelUncheckedCreateInput>
    /**
     * In case the AIModel was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AIModelUpdateInput, AIModelUncheckedUpdateInput>
  }

  /**
   * AIModel delete
   */
  export type AIModelDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
    /**
     * Filter which AIModel to delete.
     */
    where: AIModelWhereUniqueInput
  }

  /**
   * AIModel deleteMany
   */
  export type AIModelDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIModels to delete
     */
    where?: AIModelWhereInput
    /**
     * Limit how many AIModels to delete.
     */
    limit?: number
  }

  /**
   * AIModel without action
   */
  export type AIModelDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIModel
     */
    select?: AIModelSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIModel
     */
    omit?: AIModelOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIModelInclude<ExtArgs> | null
  }


  /**
   * Model MCPServer
   */

  export type AggregateMCPServer = {
    _count: MCPServerCountAggregateOutputType | null
    _min: MCPServerMinAggregateOutputType | null
    _max: MCPServerMaxAggregateOutputType | null
  }

  export type MCPServerMinAggregateOutputType = {
    id: string | null
    serverId: string | null
    name: string | null
    isActive: boolean | null
    connectionType: $Enums.ConnectionType | null
    command: string | null
    sseUrl: string | null
  }

  export type MCPServerMaxAggregateOutputType = {
    id: string | null
    serverId: string | null
    name: string | null
    isActive: boolean | null
    connectionType: $Enums.ConnectionType | null
    command: string | null
    sseUrl: string | null
  }

  export type MCPServerCountAggregateOutputType = {
    id: number
    serverId: number
    name: number
    isActive: number
    connectionType: number
    command: number
    args: number
    sseUrl: number
    _all: number
  }


  export type MCPServerMinAggregateInputType = {
    id?: true
    serverId?: true
    name?: true
    isActive?: true
    connectionType?: true
    command?: true
    sseUrl?: true
  }

  export type MCPServerMaxAggregateInputType = {
    id?: true
    serverId?: true
    name?: true
    isActive?: true
    connectionType?: true
    command?: true
    sseUrl?: true
  }

  export type MCPServerCountAggregateInputType = {
    id?: true
    serverId?: true
    name?: true
    isActive?: true
    connectionType?: true
    command?: true
    args?: true
    sseUrl?: true
    _all?: true
  }

  export type MCPServerAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MCPServer to aggregate.
     */
    where?: MCPServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MCPServers to fetch.
     */
    orderBy?: MCPServerOrderByWithRelationInput | MCPServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MCPServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MCPServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MCPServers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MCPServers
    **/
    _count?: true | MCPServerCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MCPServerMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MCPServerMaxAggregateInputType
  }

  export type GetMCPServerAggregateType<T extends MCPServerAggregateArgs> = {
        [P in keyof T & keyof AggregateMCPServer]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMCPServer[P]>
      : GetScalarType<T[P], AggregateMCPServer[P]>
  }




  export type MCPServerGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MCPServerWhereInput
    orderBy?: MCPServerOrderByWithAggregationInput | MCPServerOrderByWithAggregationInput[]
    by: MCPServerScalarFieldEnum[] | MCPServerScalarFieldEnum
    having?: MCPServerScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MCPServerCountAggregateInputType | true
    _min?: MCPServerMinAggregateInputType
    _max?: MCPServerMaxAggregateInputType
  }

  export type MCPServerGroupByOutputType = {
    id: string
    serverId: string
    name: string
    isActive: boolean
    connectionType: $Enums.ConnectionType
    command: string | null
    args: JsonValue | null
    sseUrl: string | null
    _count: MCPServerCountAggregateOutputType | null
    _min: MCPServerMinAggregateOutputType | null
    _max: MCPServerMaxAggregateOutputType | null
  }

  type GetMCPServerGroupByPayload<T extends MCPServerGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MCPServerGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MCPServerGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MCPServerGroupByOutputType[P]>
            : GetScalarType<T[P], MCPServerGroupByOutputType[P]>
        }
      >
    >


  export type MCPServerSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    serverId?: boolean
    name?: boolean
    isActive?: boolean
    connectionType?: boolean
    command?: boolean
    args?: boolean
    sseUrl?: boolean
  }, ExtArgs["result"]["mCPServer"]>

  export type MCPServerSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    serverId?: boolean
    name?: boolean
    isActive?: boolean
    connectionType?: boolean
    command?: boolean
    args?: boolean
    sseUrl?: boolean
  }, ExtArgs["result"]["mCPServer"]>

  export type MCPServerSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    serverId?: boolean
    name?: boolean
    isActive?: boolean
    connectionType?: boolean
    command?: boolean
    args?: boolean
    sseUrl?: boolean
  }, ExtArgs["result"]["mCPServer"]>

  export type MCPServerSelectScalar = {
    id?: boolean
    serverId?: boolean
    name?: boolean
    isActive?: boolean
    connectionType?: boolean
    command?: boolean
    args?: boolean
    sseUrl?: boolean
  }

  export type MCPServerOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "serverId" | "name" | "isActive" | "connectionType" | "command" | "args" | "sseUrl", ExtArgs["result"]["mCPServer"]>

  export type $MCPServerPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MCPServer"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      serverId: string
      name: string
      isActive: boolean
      connectionType: $Enums.ConnectionType
      command: string | null
      args: Prisma.JsonValue | null
      sseUrl: string | null
    }, ExtArgs["result"]["mCPServer"]>
    composites: {}
  }

  type MCPServerGetPayload<S extends boolean | null | undefined | MCPServerDefaultArgs> = $Result.GetResult<Prisma.$MCPServerPayload, S>

  type MCPServerCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MCPServerFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MCPServerCountAggregateInputType | true
    }

  export interface MCPServerDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MCPServer'], meta: { name: 'MCPServer' } }
    /**
     * Find zero or one MCPServer that matches the filter.
     * @param {MCPServerFindUniqueArgs} args - Arguments to find a MCPServer
     * @example
     * // Get one MCPServer
     * const mCPServer = await prisma.mCPServer.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MCPServerFindUniqueArgs>(args: SelectSubset<T, MCPServerFindUniqueArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MCPServer that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MCPServerFindUniqueOrThrowArgs} args - Arguments to find a MCPServer
     * @example
     * // Get one MCPServer
     * const mCPServer = await prisma.mCPServer.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MCPServerFindUniqueOrThrowArgs>(args: SelectSubset<T, MCPServerFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MCPServer that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MCPServerFindFirstArgs} args - Arguments to find a MCPServer
     * @example
     * // Get one MCPServer
     * const mCPServer = await prisma.mCPServer.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MCPServerFindFirstArgs>(args?: SelectSubset<T, MCPServerFindFirstArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MCPServer that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MCPServerFindFirstOrThrowArgs} args - Arguments to find a MCPServer
     * @example
     * // Get one MCPServer
     * const mCPServer = await prisma.mCPServer.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MCPServerFindFirstOrThrowArgs>(args?: SelectSubset<T, MCPServerFindFirstOrThrowArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MCPServers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MCPServerFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MCPServers
     * const mCPServers = await prisma.mCPServer.findMany()
     * 
     * // Get first 10 MCPServers
     * const mCPServers = await prisma.mCPServer.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const mCPServerWithIdOnly = await prisma.mCPServer.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MCPServerFindManyArgs>(args?: SelectSubset<T, MCPServerFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MCPServer.
     * @param {MCPServerCreateArgs} args - Arguments to create a MCPServer.
     * @example
     * // Create one MCPServer
     * const MCPServer = await prisma.mCPServer.create({
     *   data: {
     *     // ... data to create a MCPServer
     *   }
     * })
     * 
     */
    create<T extends MCPServerCreateArgs>(args: SelectSubset<T, MCPServerCreateArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MCPServers.
     * @param {MCPServerCreateManyArgs} args - Arguments to create many MCPServers.
     * @example
     * // Create many MCPServers
     * const mCPServer = await prisma.mCPServer.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MCPServerCreateManyArgs>(args?: SelectSubset<T, MCPServerCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MCPServers and returns the data saved in the database.
     * @param {MCPServerCreateManyAndReturnArgs} args - Arguments to create many MCPServers.
     * @example
     * // Create many MCPServers
     * const mCPServer = await prisma.mCPServer.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MCPServers and only return the `id`
     * const mCPServerWithIdOnly = await prisma.mCPServer.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MCPServerCreateManyAndReturnArgs>(args?: SelectSubset<T, MCPServerCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MCPServer.
     * @param {MCPServerDeleteArgs} args - Arguments to delete one MCPServer.
     * @example
     * // Delete one MCPServer
     * const MCPServer = await prisma.mCPServer.delete({
     *   where: {
     *     // ... filter to delete one MCPServer
     *   }
     * })
     * 
     */
    delete<T extends MCPServerDeleteArgs>(args: SelectSubset<T, MCPServerDeleteArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MCPServer.
     * @param {MCPServerUpdateArgs} args - Arguments to update one MCPServer.
     * @example
     * // Update one MCPServer
     * const mCPServer = await prisma.mCPServer.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MCPServerUpdateArgs>(args: SelectSubset<T, MCPServerUpdateArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MCPServers.
     * @param {MCPServerDeleteManyArgs} args - Arguments to filter MCPServers to delete.
     * @example
     * // Delete a few MCPServers
     * const { count } = await prisma.mCPServer.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MCPServerDeleteManyArgs>(args?: SelectSubset<T, MCPServerDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MCPServers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MCPServerUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MCPServers
     * const mCPServer = await prisma.mCPServer.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MCPServerUpdateManyArgs>(args: SelectSubset<T, MCPServerUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MCPServers and returns the data updated in the database.
     * @param {MCPServerUpdateManyAndReturnArgs} args - Arguments to update many MCPServers.
     * @example
     * // Update many MCPServers
     * const mCPServer = await prisma.mCPServer.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MCPServers and only return the `id`
     * const mCPServerWithIdOnly = await prisma.mCPServer.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MCPServerUpdateManyAndReturnArgs>(args: SelectSubset<T, MCPServerUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MCPServer.
     * @param {MCPServerUpsertArgs} args - Arguments to update or create a MCPServer.
     * @example
     * // Update or create a MCPServer
     * const mCPServer = await prisma.mCPServer.upsert({
     *   create: {
     *     // ... data to create a MCPServer
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MCPServer we want to update
     *   }
     * })
     */
    upsert<T extends MCPServerUpsertArgs>(args: SelectSubset<T, MCPServerUpsertArgs<ExtArgs>>): Prisma__MCPServerClient<$Result.GetResult<Prisma.$MCPServerPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MCPServers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MCPServerCountArgs} args - Arguments to filter MCPServers to count.
     * @example
     * // Count the number of MCPServers
     * const count = await prisma.mCPServer.count({
     *   where: {
     *     // ... the filter for the MCPServers we want to count
     *   }
     * })
    **/
    count<T extends MCPServerCountArgs>(
      args?: Subset<T, MCPServerCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MCPServerCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MCPServer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MCPServerAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MCPServerAggregateArgs>(args: Subset<T, MCPServerAggregateArgs>): Prisma.PrismaPromise<GetMCPServerAggregateType<T>>

    /**
     * Group by MCPServer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MCPServerGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MCPServerGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MCPServerGroupByArgs['orderBy'] }
        : { orderBy?: MCPServerGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MCPServerGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMCPServerGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MCPServer model
   */
  readonly fields: MCPServerFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MCPServer.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MCPServerClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MCPServer model
   */
  interface MCPServerFieldRefs {
    readonly id: FieldRef<"MCPServer", 'String'>
    readonly serverId: FieldRef<"MCPServer", 'String'>
    readonly name: FieldRef<"MCPServer", 'String'>
    readonly isActive: FieldRef<"MCPServer", 'Boolean'>
    readonly connectionType: FieldRef<"MCPServer", 'ConnectionType'>
    readonly command: FieldRef<"MCPServer", 'String'>
    readonly args: FieldRef<"MCPServer", 'Json'>
    readonly sseUrl: FieldRef<"MCPServer", 'String'>
  }
    

  // Custom InputTypes
  /**
   * MCPServer findUnique
   */
  export type MCPServerFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * Filter, which MCPServer to fetch.
     */
    where: MCPServerWhereUniqueInput
  }

  /**
   * MCPServer findUniqueOrThrow
   */
  export type MCPServerFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * Filter, which MCPServer to fetch.
     */
    where: MCPServerWhereUniqueInput
  }

  /**
   * MCPServer findFirst
   */
  export type MCPServerFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * Filter, which MCPServer to fetch.
     */
    where?: MCPServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MCPServers to fetch.
     */
    orderBy?: MCPServerOrderByWithRelationInput | MCPServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MCPServers.
     */
    cursor?: MCPServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MCPServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MCPServers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MCPServers.
     */
    distinct?: MCPServerScalarFieldEnum | MCPServerScalarFieldEnum[]
  }

  /**
   * MCPServer findFirstOrThrow
   */
  export type MCPServerFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * Filter, which MCPServer to fetch.
     */
    where?: MCPServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MCPServers to fetch.
     */
    orderBy?: MCPServerOrderByWithRelationInput | MCPServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MCPServers.
     */
    cursor?: MCPServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MCPServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MCPServers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MCPServers.
     */
    distinct?: MCPServerScalarFieldEnum | MCPServerScalarFieldEnum[]
  }

  /**
   * MCPServer findMany
   */
  export type MCPServerFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * Filter, which MCPServers to fetch.
     */
    where?: MCPServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MCPServers to fetch.
     */
    orderBy?: MCPServerOrderByWithRelationInput | MCPServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MCPServers.
     */
    cursor?: MCPServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MCPServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MCPServers.
     */
    skip?: number
    distinct?: MCPServerScalarFieldEnum | MCPServerScalarFieldEnum[]
  }

  /**
   * MCPServer create
   */
  export type MCPServerCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * The data needed to create a MCPServer.
     */
    data: XOR<MCPServerCreateInput, MCPServerUncheckedCreateInput>
  }

  /**
   * MCPServer createMany
   */
  export type MCPServerCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MCPServers.
     */
    data: MCPServerCreateManyInput | MCPServerCreateManyInput[]
  }

  /**
   * MCPServer createManyAndReturn
   */
  export type MCPServerCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * The data used to create many MCPServers.
     */
    data: MCPServerCreateManyInput | MCPServerCreateManyInput[]
  }

  /**
   * MCPServer update
   */
  export type MCPServerUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * The data needed to update a MCPServer.
     */
    data: XOR<MCPServerUpdateInput, MCPServerUncheckedUpdateInput>
    /**
     * Choose, which MCPServer to update.
     */
    where: MCPServerWhereUniqueInput
  }

  /**
   * MCPServer updateMany
   */
  export type MCPServerUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MCPServers.
     */
    data: XOR<MCPServerUpdateManyMutationInput, MCPServerUncheckedUpdateManyInput>
    /**
     * Filter which MCPServers to update
     */
    where?: MCPServerWhereInput
    /**
     * Limit how many MCPServers to update.
     */
    limit?: number
  }

  /**
   * MCPServer updateManyAndReturn
   */
  export type MCPServerUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * The data used to update MCPServers.
     */
    data: XOR<MCPServerUpdateManyMutationInput, MCPServerUncheckedUpdateManyInput>
    /**
     * Filter which MCPServers to update
     */
    where?: MCPServerWhereInput
    /**
     * Limit how many MCPServers to update.
     */
    limit?: number
  }

  /**
   * MCPServer upsert
   */
  export type MCPServerUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * The filter to search for the MCPServer to update in case it exists.
     */
    where: MCPServerWhereUniqueInput
    /**
     * In case the MCPServer found by the `where` argument doesn't exist, create a new MCPServer with this data.
     */
    create: XOR<MCPServerCreateInput, MCPServerUncheckedCreateInput>
    /**
     * In case the MCPServer was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MCPServerUpdateInput, MCPServerUncheckedUpdateInput>
  }

  /**
   * MCPServer delete
   */
  export type MCPServerDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
    /**
     * Filter which MCPServer to delete.
     */
    where: MCPServerWhereUniqueInput
  }

  /**
   * MCPServer deleteMany
   */
  export type MCPServerDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MCPServers to delete
     */
    where?: MCPServerWhereInput
    /**
     * Limit how many MCPServers to delete.
     */
    limit?: number
  }

  /**
   * MCPServer without action
   */
  export type MCPServerDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MCPServer
     */
    select?: MCPServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MCPServer
     */
    omit?: MCPServerOmit<ExtArgs> | null
  }


  /**
   * Model QuickMessage
   */

  export type AggregateQuickMessage = {
    _count: QuickMessageCountAggregateOutputType | null
    _avg: QuickMessageAvgAggregateOutputType | null
    _sum: QuickMessageSumAggregateOutputType | null
    _min: QuickMessageMinAggregateOutputType | null
    _max: QuickMessageMaxAggregateOutputType | null
  }

  export type QuickMessageAvgAggregateOutputType = {
    sortId: number | null
  }

  export type QuickMessageSumAggregateOutputType = {
    sortId: number | null
  }

  export type QuickMessageMinAggregateOutputType = {
    id: string | null
    sortId: number | null
    content: string | null
    result: string | null
    category: string | null
  }

  export type QuickMessageMaxAggregateOutputType = {
    id: string | null
    sortId: number | null
    content: string | null
    result: string | null
    category: string | null
  }

  export type QuickMessageCountAggregateOutputType = {
    id: number
    sortId: number
    content: number
    result: number
    category: number
    _all: number
  }


  export type QuickMessageAvgAggregateInputType = {
    sortId?: true
  }

  export type QuickMessageSumAggregateInputType = {
    sortId?: true
  }

  export type QuickMessageMinAggregateInputType = {
    id?: true
    sortId?: true
    content?: true
    result?: true
    category?: true
  }

  export type QuickMessageMaxAggregateInputType = {
    id?: true
    sortId?: true
    content?: true
    result?: true
    category?: true
  }

  export type QuickMessageCountAggregateInputType = {
    id?: true
    sortId?: true
    content?: true
    result?: true
    category?: true
    _all?: true
  }

  export type QuickMessageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which QuickMessage to aggregate.
     */
    where?: QuickMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QuickMessages to fetch.
     */
    orderBy?: QuickMessageOrderByWithRelationInput | QuickMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: QuickMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QuickMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QuickMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned QuickMessages
    **/
    _count?: true | QuickMessageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: QuickMessageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: QuickMessageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: QuickMessageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: QuickMessageMaxAggregateInputType
  }

  export type GetQuickMessageAggregateType<T extends QuickMessageAggregateArgs> = {
        [P in keyof T & keyof AggregateQuickMessage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateQuickMessage[P]>
      : GetScalarType<T[P], AggregateQuickMessage[P]>
  }




  export type QuickMessageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QuickMessageWhereInput
    orderBy?: QuickMessageOrderByWithAggregationInput | QuickMessageOrderByWithAggregationInput[]
    by: QuickMessageScalarFieldEnum[] | QuickMessageScalarFieldEnum
    having?: QuickMessageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: QuickMessageCountAggregateInputType | true
    _avg?: QuickMessageAvgAggregateInputType
    _sum?: QuickMessageSumAggregateInputType
    _min?: QuickMessageMinAggregateInputType
    _max?: QuickMessageMaxAggregateInputType
  }

  export type QuickMessageGroupByOutputType = {
    id: string
    sortId: number
    content: string
    result: string
    category: string
    _count: QuickMessageCountAggregateOutputType | null
    _avg: QuickMessageAvgAggregateOutputType | null
    _sum: QuickMessageSumAggregateOutputType | null
    _min: QuickMessageMinAggregateOutputType | null
    _max: QuickMessageMaxAggregateOutputType | null
  }

  type GetQuickMessageGroupByPayload<T extends QuickMessageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<QuickMessageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof QuickMessageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], QuickMessageGroupByOutputType[P]>
            : GetScalarType<T[P], QuickMessageGroupByOutputType[P]>
        }
      >
    >


  export type QuickMessageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sortId?: boolean
    content?: boolean
    result?: boolean
    category?: boolean
  }, ExtArgs["result"]["quickMessage"]>

  export type QuickMessageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sortId?: boolean
    content?: boolean
    result?: boolean
    category?: boolean
  }, ExtArgs["result"]["quickMessage"]>

  export type QuickMessageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sortId?: boolean
    content?: boolean
    result?: boolean
    category?: boolean
  }, ExtArgs["result"]["quickMessage"]>

  export type QuickMessageSelectScalar = {
    id?: boolean
    sortId?: boolean
    content?: boolean
    result?: boolean
    category?: boolean
  }

  export type QuickMessageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "sortId" | "content" | "result" | "category", ExtArgs["result"]["quickMessage"]>

  export type $QuickMessagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "QuickMessage"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      sortId: number
      content: string
      result: string
      category: string
    }, ExtArgs["result"]["quickMessage"]>
    composites: {}
  }

  type QuickMessageGetPayload<S extends boolean | null | undefined | QuickMessageDefaultArgs> = $Result.GetResult<Prisma.$QuickMessagePayload, S>

  type QuickMessageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<QuickMessageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: QuickMessageCountAggregateInputType | true
    }

  export interface QuickMessageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['QuickMessage'], meta: { name: 'QuickMessage' } }
    /**
     * Find zero or one QuickMessage that matches the filter.
     * @param {QuickMessageFindUniqueArgs} args - Arguments to find a QuickMessage
     * @example
     * // Get one QuickMessage
     * const quickMessage = await prisma.quickMessage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends QuickMessageFindUniqueArgs>(args: SelectSubset<T, QuickMessageFindUniqueArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one QuickMessage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {QuickMessageFindUniqueOrThrowArgs} args - Arguments to find a QuickMessage
     * @example
     * // Get one QuickMessage
     * const quickMessage = await prisma.quickMessage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends QuickMessageFindUniqueOrThrowArgs>(args: SelectSubset<T, QuickMessageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first QuickMessage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuickMessageFindFirstArgs} args - Arguments to find a QuickMessage
     * @example
     * // Get one QuickMessage
     * const quickMessage = await prisma.quickMessage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends QuickMessageFindFirstArgs>(args?: SelectSubset<T, QuickMessageFindFirstArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first QuickMessage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuickMessageFindFirstOrThrowArgs} args - Arguments to find a QuickMessage
     * @example
     * // Get one QuickMessage
     * const quickMessage = await prisma.quickMessage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends QuickMessageFindFirstOrThrowArgs>(args?: SelectSubset<T, QuickMessageFindFirstOrThrowArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more QuickMessages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuickMessageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all QuickMessages
     * const quickMessages = await prisma.quickMessage.findMany()
     * 
     * // Get first 10 QuickMessages
     * const quickMessages = await prisma.quickMessage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const quickMessageWithIdOnly = await prisma.quickMessage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends QuickMessageFindManyArgs>(args?: SelectSubset<T, QuickMessageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a QuickMessage.
     * @param {QuickMessageCreateArgs} args - Arguments to create a QuickMessage.
     * @example
     * // Create one QuickMessage
     * const QuickMessage = await prisma.quickMessage.create({
     *   data: {
     *     // ... data to create a QuickMessage
     *   }
     * })
     * 
     */
    create<T extends QuickMessageCreateArgs>(args: SelectSubset<T, QuickMessageCreateArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many QuickMessages.
     * @param {QuickMessageCreateManyArgs} args - Arguments to create many QuickMessages.
     * @example
     * // Create many QuickMessages
     * const quickMessage = await prisma.quickMessage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends QuickMessageCreateManyArgs>(args?: SelectSubset<T, QuickMessageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many QuickMessages and returns the data saved in the database.
     * @param {QuickMessageCreateManyAndReturnArgs} args - Arguments to create many QuickMessages.
     * @example
     * // Create many QuickMessages
     * const quickMessage = await prisma.quickMessage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many QuickMessages and only return the `id`
     * const quickMessageWithIdOnly = await prisma.quickMessage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends QuickMessageCreateManyAndReturnArgs>(args?: SelectSubset<T, QuickMessageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a QuickMessage.
     * @param {QuickMessageDeleteArgs} args - Arguments to delete one QuickMessage.
     * @example
     * // Delete one QuickMessage
     * const QuickMessage = await prisma.quickMessage.delete({
     *   where: {
     *     // ... filter to delete one QuickMessage
     *   }
     * })
     * 
     */
    delete<T extends QuickMessageDeleteArgs>(args: SelectSubset<T, QuickMessageDeleteArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one QuickMessage.
     * @param {QuickMessageUpdateArgs} args - Arguments to update one QuickMessage.
     * @example
     * // Update one QuickMessage
     * const quickMessage = await prisma.quickMessage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends QuickMessageUpdateArgs>(args: SelectSubset<T, QuickMessageUpdateArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more QuickMessages.
     * @param {QuickMessageDeleteManyArgs} args - Arguments to filter QuickMessages to delete.
     * @example
     * // Delete a few QuickMessages
     * const { count } = await prisma.quickMessage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends QuickMessageDeleteManyArgs>(args?: SelectSubset<T, QuickMessageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more QuickMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuickMessageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many QuickMessages
     * const quickMessage = await prisma.quickMessage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends QuickMessageUpdateManyArgs>(args: SelectSubset<T, QuickMessageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more QuickMessages and returns the data updated in the database.
     * @param {QuickMessageUpdateManyAndReturnArgs} args - Arguments to update many QuickMessages.
     * @example
     * // Update many QuickMessages
     * const quickMessage = await prisma.quickMessage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more QuickMessages and only return the `id`
     * const quickMessageWithIdOnly = await prisma.quickMessage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends QuickMessageUpdateManyAndReturnArgs>(args: SelectSubset<T, QuickMessageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one QuickMessage.
     * @param {QuickMessageUpsertArgs} args - Arguments to update or create a QuickMessage.
     * @example
     * // Update or create a QuickMessage
     * const quickMessage = await prisma.quickMessage.upsert({
     *   create: {
     *     // ... data to create a QuickMessage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the QuickMessage we want to update
     *   }
     * })
     */
    upsert<T extends QuickMessageUpsertArgs>(args: SelectSubset<T, QuickMessageUpsertArgs<ExtArgs>>): Prisma__QuickMessageClient<$Result.GetResult<Prisma.$QuickMessagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of QuickMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuickMessageCountArgs} args - Arguments to filter QuickMessages to count.
     * @example
     * // Count the number of QuickMessages
     * const count = await prisma.quickMessage.count({
     *   where: {
     *     // ... the filter for the QuickMessages we want to count
     *   }
     * })
    **/
    count<T extends QuickMessageCountArgs>(
      args?: Subset<T, QuickMessageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], QuickMessageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a QuickMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuickMessageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends QuickMessageAggregateArgs>(args: Subset<T, QuickMessageAggregateArgs>): Prisma.PrismaPromise<GetQuickMessageAggregateType<T>>

    /**
     * Group by QuickMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuickMessageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends QuickMessageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: QuickMessageGroupByArgs['orderBy'] }
        : { orderBy?: QuickMessageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, QuickMessageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetQuickMessageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the QuickMessage model
   */
  readonly fields: QuickMessageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for QuickMessage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__QuickMessageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the QuickMessage model
   */
  interface QuickMessageFieldRefs {
    readonly id: FieldRef<"QuickMessage", 'String'>
    readonly sortId: FieldRef<"QuickMessage", 'Int'>
    readonly content: FieldRef<"QuickMessage", 'String'>
    readonly result: FieldRef<"QuickMessage", 'String'>
    readonly category: FieldRef<"QuickMessage", 'String'>
  }
    

  // Custom InputTypes
  /**
   * QuickMessage findUnique
   */
  export type QuickMessageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * Filter, which QuickMessage to fetch.
     */
    where: QuickMessageWhereUniqueInput
  }

  /**
   * QuickMessage findUniqueOrThrow
   */
  export type QuickMessageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * Filter, which QuickMessage to fetch.
     */
    where: QuickMessageWhereUniqueInput
  }

  /**
   * QuickMessage findFirst
   */
  export type QuickMessageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * Filter, which QuickMessage to fetch.
     */
    where?: QuickMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QuickMessages to fetch.
     */
    orderBy?: QuickMessageOrderByWithRelationInput | QuickMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for QuickMessages.
     */
    cursor?: QuickMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QuickMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QuickMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of QuickMessages.
     */
    distinct?: QuickMessageScalarFieldEnum | QuickMessageScalarFieldEnum[]
  }

  /**
   * QuickMessage findFirstOrThrow
   */
  export type QuickMessageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * Filter, which QuickMessage to fetch.
     */
    where?: QuickMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QuickMessages to fetch.
     */
    orderBy?: QuickMessageOrderByWithRelationInput | QuickMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for QuickMessages.
     */
    cursor?: QuickMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QuickMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QuickMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of QuickMessages.
     */
    distinct?: QuickMessageScalarFieldEnum | QuickMessageScalarFieldEnum[]
  }

  /**
   * QuickMessage findMany
   */
  export type QuickMessageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * Filter, which QuickMessages to fetch.
     */
    where?: QuickMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QuickMessages to fetch.
     */
    orderBy?: QuickMessageOrderByWithRelationInput | QuickMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing QuickMessages.
     */
    cursor?: QuickMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QuickMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QuickMessages.
     */
    skip?: number
    distinct?: QuickMessageScalarFieldEnum | QuickMessageScalarFieldEnum[]
  }

  /**
   * QuickMessage create
   */
  export type QuickMessageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * The data needed to create a QuickMessage.
     */
    data: XOR<QuickMessageCreateInput, QuickMessageUncheckedCreateInput>
  }

  /**
   * QuickMessage createMany
   */
  export type QuickMessageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many QuickMessages.
     */
    data: QuickMessageCreateManyInput | QuickMessageCreateManyInput[]
  }

  /**
   * QuickMessage createManyAndReturn
   */
  export type QuickMessageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * The data used to create many QuickMessages.
     */
    data: QuickMessageCreateManyInput | QuickMessageCreateManyInput[]
  }

  /**
   * QuickMessage update
   */
  export type QuickMessageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * The data needed to update a QuickMessage.
     */
    data: XOR<QuickMessageUpdateInput, QuickMessageUncheckedUpdateInput>
    /**
     * Choose, which QuickMessage to update.
     */
    where: QuickMessageWhereUniqueInput
  }

  /**
   * QuickMessage updateMany
   */
  export type QuickMessageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update QuickMessages.
     */
    data: XOR<QuickMessageUpdateManyMutationInput, QuickMessageUncheckedUpdateManyInput>
    /**
     * Filter which QuickMessages to update
     */
    where?: QuickMessageWhereInput
    /**
     * Limit how many QuickMessages to update.
     */
    limit?: number
  }

  /**
   * QuickMessage updateManyAndReturn
   */
  export type QuickMessageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * The data used to update QuickMessages.
     */
    data: XOR<QuickMessageUpdateManyMutationInput, QuickMessageUncheckedUpdateManyInput>
    /**
     * Filter which QuickMessages to update
     */
    where?: QuickMessageWhereInput
    /**
     * Limit how many QuickMessages to update.
     */
    limit?: number
  }

  /**
   * QuickMessage upsert
   */
  export type QuickMessageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * The filter to search for the QuickMessage to update in case it exists.
     */
    where: QuickMessageWhereUniqueInput
    /**
     * In case the QuickMessage found by the `where` argument doesn't exist, create a new QuickMessage with this data.
     */
    create: XOR<QuickMessageCreateInput, QuickMessageUncheckedCreateInput>
    /**
     * In case the QuickMessage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<QuickMessageUpdateInput, QuickMessageUncheckedUpdateInput>
  }

  /**
   * QuickMessage delete
   */
  export type QuickMessageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
    /**
     * Filter which QuickMessage to delete.
     */
    where: QuickMessageWhereUniqueInput
  }

  /**
   * QuickMessage deleteMany
   */
  export type QuickMessageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which QuickMessages to delete
     */
    where?: QuickMessageWhereInput
    /**
     * Limit how many QuickMessages to delete.
     */
    limit?: number
  }

  /**
   * QuickMessage without action
   */
  export type QuickMessageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuickMessage
     */
    select?: QuickMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the QuickMessage
     */
    omit?: QuickMessageOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SettingScalarFieldEnum: {
    key: 'key',
    value: 'value'
  };

  export type SettingScalarFieldEnum = (typeof SettingScalarFieldEnum)[keyof typeof SettingScalarFieldEnum]


  export const AIProviderScalarFieldEnum: {
    id: 'id',
    name: 'name',
    type: 'type',
    apiUrl: 'apiUrl',
    apiKey: 'apiKey',
    defaultModelValue: 'defaultModelValue'
  };

  export type AIProviderScalarFieldEnum = (typeof AIProviderScalarFieldEnum)[keyof typeof AIProviderScalarFieldEnum]


  export const AIModelScalarFieldEnum: {
    id: 'id',
    value: 'value',
    label: 'label',
    providerId: 'providerId'
  };

  export type AIModelScalarFieldEnum = (typeof AIModelScalarFieldEnum)[keyof typeof AIModelScalarFieldEnum]


  export const MCPServerScalarFieldEnum: {
    id: 'id',
    serverId: 'serverId',
    name: 'name',
    isActive: 'isActive',
    connectionType: 'connectionType',
    command: 'command',
    args: 'args',
    sseUrl: 'sseUrl'
  };

  export type MCPServerScalarFieldEnum = (typeof MCPServerScalarFieldEnum)[keyof typeof MCPServerScalarFieldEnum]


  export const QuickMessageScalarFieldEnum: {
    id: 'id',
    sortId: 'sortId',
    content: 'content',
    result: 'result',
    category: 'category'
  };

  export type QuickMessageScalarFieldEnum = (typeof QuickMessageScalarFieldEnum)[keyof typeof QuickMessageScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'ProviderType'
   */
  export type EnumProviderTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ProviderType'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'ConnectionType'
   */
  export type EnumConnectionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectionType'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type SettingWhereInput = {
    AND?: SettingWhereInput | SettingWhereInput[]
    OR?: SettingWhereInput[]
    NOT?: SettingWhereInput | SettingWhereInput[]
    key?: StringFilter<"Setting"> | string
    value?: JsonFilter<"Setting">
  }

  export type SettingOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
  }

  export type SettingWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: SettingWhereInput | SettingWhereInput[]
    OR?: SettingWhereInput[]
    NOT?: SettingWhereInput | SettingWhereInput[]
    value?: JsonFilter<"Setting">
  }, "key">

  export type SettingOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    _count?: SettingCountOrderByAggregateInput
    _max?: SettingMaxOrderByAggregateInput
    _min?: SettingMinOrderByAggregateInput
  }

  export type SettingScalarWhereWithAggregatesInput = {
    AND?: SettingScalarWhereWithAggregatesInput | SettingScalarWhereWithAggregatesInput[]
    OR?: SettingScalarWhereWithAggregatesInput[]
    NOT?: SettingScalarWhereWithAggregatesInput | SettingScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"Setting"> | string
    value?: JsonWithAggregatesFilter<"Setting">
  }

  export type AIProviderWhereInput = {
    AND?: AIProviderWhereInput | AIProviderWhereInput[]
    OR?: AIProviderWhereInput[]
    NOT?: AIProviderWhereInput | AIProviderWhereInput[]
    id?: StringFilter<"AIProvider"> | string
    name?: StringFilter<"AIProvider"> | string
    type?: EnumProviderTypeFilter<"AIProvider"> | $Enums.ProviderType
    apiUrl?: StringFilter<"AIProvider"> | string
    apiKey?: StringFilter<"AIProvider"> | string
    defaultModelValue?: StringFilter<"AIProvider"> | string
    models?: AIModelListRelationFilter
  }

  export type AIProviderOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    type?: SortOrder
    apiUrl?: SortOrder
    apiKey?: SortOrder
    defaultModelValue?: SortOrder
    models?: AIModelOrderByRelationAggregateInput
  }

  export type AIProviderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    name?: string
    AND?: AIProviderWhereInput | AIProviderWhereInput[]
    OR?: AIProviderWhereInput[]
    NOT?: AIProviderWhereInput | AIProviderWhereInput[]
    type?: EnumProviderTypeFilter<"AIProvider"> | $Enums.ProviderType
    apiUrl?: StringFilter<"AIProvider"> | string
    apiKey?: StringFilter<"AIProvider"> | string
    defaultModelValue?: StringFilter<"AIProvider"> | string
    models?: AIModelListRelationFilter
  }, "id" | "name">

  export type AIProviderOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    type?: SortOrder
    apiUrl?: SortOrder
    apiKey?: SortOrder
    defaultModelValue?: SortOrder
    _count?: AIProviderCountOrderByAggregateInput
    _max?: AIProviderMaxOrderByAggregateInput
    _min?: AIProviderMinOrderByAggregateInput
  }

  export type AIProviderScalarWhereWithAggregatesInput = {
    AND?: AIProviderScalarWhereWithAggregatesInput | AIProviderScalarWhereWithAggregatesInput[]
    OR?: AIProviderScalarWhereWithAggregatesInput[]
    NOT?: AIProviderScalarWhereWithAggregatesInput | AIProviderScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AIProvider"> | string
    name?: StringWithAggregatesFilter<"AIProvider"> | string
    type?: EnumProviderTypeWithAggregatesFilter<"AIProvider"> | $Enums.ProviderType
    apiUrl?: StringWithAggregatesFilter<"AIProvider"> | string
    apiKey?: StringWithAggregatesFilter<"AIProvider"> | string
    defaultModelValue?: StringWithAggregatesFilter<"AIProvider"> | string
  }

  export type AIModelWhereInput = {
    AND?: AIModelWhereInput | AIModelWhereInput[]
    OR?: AIModelWhereInput[]
    NOT?: AIModelWhereInput | AIModelWhereInput[]
    id?: StringFilter<"AIModel"> | string
    value?: StringFilter<"AIModel"> | string
    label?: StringFilter<"AIModel"> | string
    providerId?: StringFilter<"AIModel"> | string
    provider?: XOR<AIProviderScalarRelationFilter, AIProviderWhereInput>
  }

  export type AIModelOrderByWithRelationInput = {
    id?: SortOrder
    value?: SortOrder
    label?: SortOrder
    providerId?: SortOrder
    provider?: AIProviderOrderByWithRelationInput
  }

  export type AIModelWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    providerId_value?: AIModelProviderIdValueCompoundUniqueInput
    AND?: AIModelWhereInput | AIModelWhereInput[]
    OR?: AIModelWhereInput[]
    NOT?: AIModelWhereInput | AIModelWhereInput[]
    value?: StringFilter<"AIModel"> | string
    label?: StringFilter<"AIModel"> | string
    providerId?: StringFilter<"AIModel"> | string
    provider?: XOR<AIProviderScalarRelationFilter, AIProviderWhereInput>
  }, "id" | "providerId_value">

  export type AIModelOrderByWithAggregationInput = {
    id?: SortOrder
    value?: SortOrder
    label?: SortOrder
    providerId?: SortOrder
    _count?: AIModelCountOrderByAggregateInput
    _max?: AIModelMaxOrderByAggregateInput
    _min?: AIModelMinOrderByAggregateInput
  }

  export type AIModelScalarWhereWithAggregatesInput = {
    AND?: AIModelScalarWhereWithAggregatesInput | AIModelScalarWhereWithAggregatesInput[]
    OR?: AIModelScalarWhereWithAggregatesInput[]
    NOT?: AIModelScalarWhereWithAggregatesInput | AIModelScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AIModel"> | string
    value?: StringWithAggregatesFilter<"AIModel"> | string
    label?: StringWithAggregatesFilter<"AIModel"> | string
    providerId?: StringWithAggregatesFilter<"AIModel"> | string
  }

  export type MCPServerWhereInput = {
    AND?: MCPServerWhereInput | MCPServerWhereInput[]
    OR?: MCPServerWhereInput[]
    NOT?: MCPServerWhereInput | MCPServerWhereInput[]
    id?: StringFilter<"MCPServer"> | string
    serverId?: StringFilter<"MCPServer"> | string
    name?: StringFilter<"MCPServer"> | string
    isActive?: BoolFilter<"MCPServer"> | boolean
    connectionType?: EnumConnectionTypeFilter<"MCPServer"> | $Enums.ConnectionType
    command?: StringNullableFilter<"MCPServer"> | string | null
    args?: JsonNullableFilter<"MCPServer">
    sseUrl?: StringNullableFilter<"MCPServer"> | string | null
  }

  export type MCPServerOrderByWithRelationInput = {
    id?: SortOrder
    serverId?: SortOrder
    name?: SortOrder
    isActive?: SortOrder
    connectionType?: SortOrder
    command?: SortOrderInput | SortOrder
    args?: SortOrderInput | SortOrder
    sseUrl?: SortOrderInput | SortOrder
  }

  export type MCPServerWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    serverId?: string
    AND?: MCPServerWhereInput | MCPServerWhereInput[]
    OR?: MCPServerWhereInput[]
    NOT?: MCPServerWhereInput | MCPServerWhereInput[]
    name?: StringFilter<"MCPServer"> | string
    isActive?: BoolFilter<"MCPServer"> | boolean
    connectionType?: EnumConnectionTypeFilter<"MCPServer"> | $Enums.ConnectionType
    command?: StringNullableFilter<"MCPServer"> | string | null
    args?: JsonNullableFilter<"MCPServer">
    sseUrl?: StringNullableFilter<"MCPServer"> | string | null
  }, "id" | "serverId">

  export type MCPServerOrderByWithAggregationInput = {
    id?: SortOrder
    serverId?: SortOrder
    name?: SortOrder
    isActive?: SortOrder
    connectionType?: SortOrder
    command?: SortOrderInput | SortOrder
    args?: SortOrderInput | SortOrder
    sseUrl?: SortOrderInput | SortOrder
    _count?: MCPServerCountOrderByAggregateInput
    _max?: MCPServerMaxOrderByAggregateInput
    _min?: MCPServerMinOrderByAggregateInput
  }

  export type MCPServerScalarWhereWithAggregatesInput = {
    AND?: MCPServerScalarWhereWithAggregatesInput | MCPServerScalarWhereWithAggregatesInput[]
    OR?: MCPServerScalarWhereWithAggregatesInput[]
    NOT?: MCPServerScalarWhereWithAggregatesInput | MCPServerScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MCPServer"> | string
    serverId?: StringWithAggregatesFilter<"MCPServer"> | string
    name?: StringWithAggregatesFilter<"MCPServer"> | string
    isActive?: BoolWithAggregatesFilter<"MCPServer"> | boolean
    connectionType?: EnumConnectionTypeWithAggregatesFilter<"MCPServer"> | $Enums.ConnectionType
    command?: StringNullableWithAggregatesFilter<"MCPServer"> | string | null
    args?: JsonNullableWithAggregatesFilter<"MCPServer">
    sseUrl?: StringNullableWithAggregatesFilter<"MCPServer"> | string | null
  }

  export type QuickMessageWhereInput = {
    AND?: QuickMessageWhereInput | QuickMessageWhereInput[]
    OR?: QuickMessageWhereInput[]
    NOT?: QuickMessageWhereInput | QuickMessageWhereInput[]
    id?: StringFilter<"QuickMessage"> | string
    sortId?: IntFilter<"QuickMessage"> | number
    content?: StringFilter<"QuickMessage"> | string
    result?: StringFilter<"QuickMessage"> | string
    category?: StringFilter<"QuickMessage"> | string
  }

  export type QuickMessageOrderByWithRelationInput = {
    id?: SortOrder
    sortId?: SortOrder
    content?: SortOrder
    result?: SortOrder
    category?: SortOrder
  }

  export type QuickMessageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    sortId?: number
    AND?: QuickMessageWhereInput | QuickMessageWhereInput[]
    OR?: QuickMessageWhereInput[]
    NOT?: QuickMessageWhereInput | QuickMessageWhereInput[]
    content?: StringFilter<"QuickMessage"> | string
    result?: StringFilter<"QuickMessage"> | string
    category?: StringFilter<"QuickMessage"> | string
  }, "id" | "sortId">

  export type QuickMessageOrderByWithAggregationInput = {
    id?: SortOrder
    sortId?: SortOrder
    content?: SortOrder
    result?: SortOrder
    category?: SortOrder
    _count?: QuickMessageCountOrderByAggregateInput
    _avg?: QuickMessageAvgOrderByAggregateInput
    _max?: QuickMessageMaxOrderByAggregateInput
    _min?: QuickMessageMinOrderByAggregateInput
    _sum?: QuickMessageSumOrderByAggregateInput
  }

  export type QuickMessageScalarWhereWithAggregatesInput = {
    AND?: QuickMessageScalarWhereWithAggregatesInput | QuickMessageScalarWhereWithAggregatesInput[]
    OR?: QuickMessageScalarWhereWithAggregatesInput[]
    NOT?: QuickMessageScalarWhereWithAggregatesInput | QuickMessageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"QuickMessage"> | string
    sortId?: IntWithAggregatesFilter<"QuickMessage"> | number
    content?: StringWithAggregatesFilter<"QuickMessage"> | string
    result?: StringWithAggregatesFilter<"QuickMessage"> | string
    category?: StringWithAggregatesFilter<"QuickMessage"> | string
  }

  export type SettingCreateInput = {
    key: string
    value: JsonNullValueInput | InputJsonValue
  }

  export type SettingUncheckedCreateInput = {
    key: string
    value: JsonNullValueInput | InputJsonValue
  }

  export type SettingUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
  }

  export type SettingUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
  }

  export type SettingCreateManyInput = {
    key: string
    value: JsonNullValueInput | InputJsonValue
  }

  export type SettingUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
  }

  export type SettingUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
  }

  export type AIProviderCreateInput = {
    id?: string
    name: string
    type: $Enums.ProviderType
    apiUrl: string
    apiKey: string
    defaultModelValue: string
    models?: AIModelCreateNestedManyWithoutProviderInput
  }

  export type AIProviderUncheckedCreateInput = {
    id?: string
    name: string
    type: $Enums.ProviderType
    apiUrl: string
    apiKey: string
    defaultModelValue: string
    models?: AIModelUncheckedCreateNestedManyWithoutProviderInput
  }

  export type AIProviderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumProviderTypeFieldUpdateOperationsInput | $Enums.ProviderType
    apiUrl?: StringFieldUpdateOperationsInput | string
    apiKey?: StringFieldUpdateOperationsInput | string
    defaultModelValue?: StringFieldUpdateOperationsInput | string
    models?: AIModelUpdateManyWithoutProviderNestedInput
  }

  export type AIProviderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumProviderTypeFieldUpdateOperationsInput | $Enums.ProviderType
    apiUrl?: StringFieldUpdateOperationsInput | string
    apiKey?: StringFieldUpdateOperationsInput | string
    defaultModelValue?: StringFieldUpdateOperationsInput | string
    models?: AIModelUncheckedUpdateManyWithoutProviderNestedInput
  }

  export type AIProviderCreateManyInput = {
    id?: string
    name: string
    type: $Enums.ProviderType
    apiUrl: string
    apiKey: string
    defaultModelValue: string
  }

  export type AIProviderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumProviderTypeFieldUpdateOperationsInput | $Enums.ProviderType
    apiUrl?: StringFieldUpdateOperationsInput | string
    apiKey?: StringFieldUpdateOperationsInput | string
    defaultModelValue?: StringFieldUpdateOperationsInput | string
  }

  export type AIProviderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumProviderTypeFieldUpdateOperationsInput | $Enums.ProviderType
    apiUrl?: StringFieldUpdateOperationsInput | string
    apiKey?: StringFieldUpdateOperationsInput | string
    defaultModelValue?: StringFieldUpdateOperationsInput | string
  }

  export type AIModelCreateInput = {
    id?: string
    value: string
    label: string
    provider: AIProviderCreateNestedOneWithoutModelsInput
  }

  export type AIModelUncheckedCreateInput = {
    id?: string
    value: string
    label: string
    providerId: string
  }

  export type AIModelUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    provider?: AIProviderUpdateOneRequiredWithoutModelsNestedInput
  }

  export type AIModelUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
  }

  export type AIModelCreateManyInput = {
    id?: string
    value: string
    label: string
    providerId: string
  }

  export type AIModelUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
  }

  export type AIModelUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
  }

  export type MCPServerCreateInput = {
    id?: string
    serverId: string
    name: string
    isActive: boolean
    connectionType: $Enums.ConnectionType
    command?: string | null
    args?: NullableJsonNullValueInput | InputJsonValue
    sseUrl?: string | null
  }

  export type MCPServerUncheckedCreateInput = {
    id?: string
    serverId: string
    name: string
    isActive: boolean
    connectionType: $Enums.ConnectionType
    command?: string | null
    args?: NullableJsonNullValueInput | InputJsonValue
    sseUrl?: string | null
  }

  export type MCPServerUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    serverId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    connectionType?: EnumConnectionTypeFieldUpdateOperationsInput | $Enums.ConnectionType
    command?: NullableStringFieldUpdateOperationsInput | string | null
    args?: NullableJsonNullValueInput | InputJsonValue
    sseUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MCPServerUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    serverId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    connectionType?: EnumConnectionTypeFieldUpdateOperationsInput | $Enums.ConnectionType
    command?: NullableStringFieldUpdateOperationsInput | string | null
    args?: NullableJsonNullValueInput | InputJsonValue
    sseUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MCPServerCreateManyInput = {
    id?: string
    serverId: string
    name: string
    isActive: boolean
    connectionType: $Enums.ConnectionType
    command?: string | null
    args?: NullableJsonNullValueInput | InputJsonValue
    sseUrl?: string | null
  }

  export type MCPServerUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    serverId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    connectionType?: EnumConnectionTypeFieldUpdateOperationsInput | $Enums.ConnectionType
    command?: NullableStringFieldUpdateOperationsInput | string | null
    args?: NullableJsonNullValueInput | InputJsonValue
    sseUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MCPServerUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    serverId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    connectionType?: EnumConnectionTypeFieldUpdateOperationsInput | $Enums.ConnectionType
    command?: NullableStringFieldUpdateOperationsInput | string | null
    args?: NullableJsonNullValueInput | InputJsonValue
    sseUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type QuickMessageCreateInput = {
    id?: string
    sortId: number
    content: string
    result: string
    category?: string
  }

  export type QuickMessageUncheckedCreateInput = {
    id?: string
    sortId: number
    content: string
    result: string
    category?: string
  }

  export type QuickMessageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sortId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    result?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
  }

  export type QuickMessageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sortId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    result?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
  }

  export type QuickMessageCreateManyInput = {
    id?: string
    sortId: number
    content: string
    result: string
    category?: string
  }

  export type QuickMessageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    sortId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    result?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
  }

  export type QuickMessageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    sortId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    result?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type SettingCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
  }

  export type SettingMaxOrderByAggregateInput = {
    key?: SortOrder
  }

  export type SettingMinOrderByAggregateInput = {
    key?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type EnumProviderTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ProviderType | EnumProviderTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ProviderType[]
    notIn?: $Enums.ProviderType[]
    not?: NestedEnumProviderTypeFilter<$PrismaModel> | $Enums.ProviderType
  }

  export type AIModelListRelationFilter = {
    every?: AIModelWhereInput
    some?: AIModelWhereInput
    none?: AIModelWhereInput
  }

  export type AIModelOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AIProviderCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    type?: SortOrder
    apiUrl?: SortOrder
    apiKey?: SortOrder
    defaultModelValue?: SortOrder
  }

  export type AIProviderMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    type?: SortOrder
    apiUrl?: SortOrder
    apiKey?: SortOrder
    defaultModelValue?: SortOrder
  }

  export type AIProviderMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    type?: SortOrder
    apiUrl?: SortOrder
    apiKey?: SortOrder
    defaultModelValue?: SortOrder
  }

  export type EnumProviderTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ProviderType | EnumProviderTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ProviderType[]
    notIn?: $Enums.ProviderType[]
    not?: NestedEnumProviderTypeWithAggregatesFilter<$PrismaModel> | $Enums.ProviderType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumProviderTypeFilter<$PrismaModel>
    _max?: NestedEnumProviderTypeFilter<$PrismaModel>
  }

  export type AIProviderScalarRelationFilter = {
    is?: AIProviderWhereInput
    isNot?: AIProviderWhereInput
  }

  export type AIModelProviderIdValueCompoundUniqueInput = {
    providerId: string
    value: string
  }

  export type AIModelCountOrderByAggregateInput = {
    id?: SortOrder
    value?: SortOrder
    label?: SortOrder
    providerId?: SortOrder
  }

  export type AIModelMaxOrderByAggregateInput = {
    id?: SortOrder
    value?: SortOrder
    label?: SortOrder
    providerId?: SortOrder
  }

  export type AIModelMinOrderByAggregateInput = {
    id?: SortOrder
    value?: SortOrder
    label?: SortOrder
    providerId?: SortOrder
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EnumConnectionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionType | EnumConnectionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionType[]
    notIn?: $Enums.ConnectionType[]
    not?: NestedEnumConnectionTypeFilter<$PrismaModel> | $Enums.ConnectionType
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type MCPServerCountOrderByAggregateInput = {
    id?: SortOrder
    serverId?: SortOrder
    name?: SortOrder
    isActive?: SortOrder
    connectionType?: SortOrder
    command?: SortOrder
    args?: SortOrder
    sseUrl?: SortOrder
  }

  export type MCPServerMaxOrderByAggregateInput = {
    id?: SortOrder
    serverId?: SortOrder
    name?: SortOrder
    isActive?: SortOrder
    connectionType?: SortOrder
    command?: SortOrder
    sseUrl?: SortOrder
  }

  export type MCPServerMinOrderByAggregateInput = {
    id?: SortOrder
    serverId?: SortOrder
    name?: SortOrder
    isActive?: SortOrder
    connectionType?: SortOrder
    command?: SortOrder
    sseUrl?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumConnectionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionType | EnumConnectionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionType[]
    notIn?: $Enums.ConnectionType[]
    not?: NestedEnumConnectionTypeWithAggregatesFilter<$PrismaModel> | $Enums.ConnectionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectionTypeFilter<$PrismaModel>
    _max?: NestedEnumConnectionTypeFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type QuickMessageCountOrderByAggregateInput = {
    id?: SortOrder
    sortId?: SortOrder
    content?: SortOrder
    result?: SortOrder
    category?: SortOrder
  }

  export type QuickMessageAvgOrderByAggregateInput = {
    sortId?: SortOrder
  }

  export type QuickMessageMaxOrderByAggregateInput = {
    id?: SortOrder
    sortId?: SortOrder
    content?: SortOrder
    result?: SortOrder
    category?: SortOrder
  }

  export type QuickMessageMinOrderByAggregateInput = {
    id?: SortOrder
    sortId?: SortOrder
    content?: SortOrder
    result?: SortOrder
    category?: SortOrder
  }

  export type QuickMessageSumOrderByAggregateInput = {
    sortId?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type AIModelCreateNestedManyWithoutProviderInput = {
    create?: XOR<AIModelCreateWithoutProviderInput, AIModelUncheckedCreateWithoutProviderInput> | AIModelCreateWithoutProviderInput[] | AIModelUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AIModelCreateOrConnectWithoutProviderInput | AIModelCreateOrConnectWithoutProviderInput[]
    createMany?: AIModelCreateManyProviderInputEnvelope
    connect?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
  }

  export type AIModelUncheckedCreateNestedManyWithoutProviderInput = {
    create?: XOR<AIModelCreateWithoutProviderInput, AIModelUncheckedCreateWithoutProviderInput> | AIModelCreateWithoutProviderInput[] | AIModelUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AIModelCreateOrConnectWithoutProviderInput | AIModelCreateOrConnectWithoutProviderInput[]
    createMany?: AIModelCreateManyProviderInputEnvelope
    connect?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
  }

  export type EnumProviderTypeFieldUpdateOperationsInput = {
    set?: $Enums.ProviderType
  }

  export type AIModelUpdateManyWithoutProviderNestedInput = {
    create?: XOR<AIModelCreateWithoutProviderInput, AIModelUncheckedCreateWithoutProviderInput> | AIModelCreateWithoutProviderInput[] | AIModelUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AIModelCreateOrConnectWithoutProviderInput | AIModelCreateOrConnectWithoutProviderInput[]
    upsert?: AIModelUpsertWithWhereUniqueWithoutProviderInput | AIModelUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: AIModelCreateManyProviderInputEnvelope
    set?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    disconnect?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    delete?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    connect?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    update?: AIModelUpdateWithWhereUniqueWithoutProviderInput | AIModelUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: AIModelUpdateManyWithWhereWithoutProviderInput | AIModelUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: AIModelScalarWhereInput | AIModelScalarWhereInput[]
  }

  export type AIModelUncheckedUpdateManyWithoutProviderNestedInput = {
    create?: XOR<AIModelCreateWithoutProviderInput, AIModelUncheckedCreateWithoutProviderInput> | AIModelCreateWithoutProviderInput[] | AIModelUncheckedCreateWithoutProviderInput[]
    connectOrCreate?: AIModelCreateOrConnectWithoutProviderInput | AIModelCreateOrConnectWithoutProviderInput[]
    upsert?: AIModelUpsertWithWhereUniqueWithoutProviderInput | AIModelUpsertWithWhereUniqueWithoutProviderInput[]
    createMany?: AIModelCreateManyProviderInputEnvelope
    set?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    disconnect?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    delete?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    connect?: AIModelWhereUniqueInput | AIModelWhereUniqueInput[]
    update?: AIModelUpdateWithWhereUniqueWithoutProviderInput | AIModelUpdateWithWhereUniqueWithoutProviderInput[]
    updateMany?: AIModelUpdateManyWithWhereWithoutProviderInput | AIModelUpdateManyWithWhereWithoutProviderInput[]
    deleteMany?: AIModelScalarWhereInput | AIModelScalarWhereInput[]
  }

  export type AIProviderCreateNestedOneWithoutModelsInput = {
    create?: XOR<AIProviderCreateWithoutModelsInput, AIProviderUncheckedCreateWithoutModelsInput>
    connectOrCreate?: AIProviderCreateOrConnectWithoutModelsInput
    connect?: AIProviderWhereUniqueInput
  }

  export type AIProviderUpdateOneRequiredWithoutModelsNestedInput = {
    create?: XOR<AIProviderCreateWithoutModelsInput, AIProviderUncheckedCreateWithoutModelsInput>
    connectOrCreate?: AIProviderCreateOrConnectWithoutModelsInput
    upsert?: AIProviderUpsertWithoutModelsInput
    connect?: AIProviderWhereUniqueInput
    update?: XOR<XOR<AIProviderUpdateToOneWithWhereWithoutModelsInput, AIProviderUpdateWithoutModelsInput>, AIProviderUncheckedUpdateWithoutModelsInput>
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EnumConnectionTypeFieldUpdateOperationsInput = {
    set?: $Enums.ConnectionType
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumProviderTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ProviderType | EnumProviderTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ProviderType[]
    notIn?: $Enums.ProviderType[]
    not?: NestedEnumProviderTypeFilter<$PrismaModel> | $Enums.ProviderType
  }

  export type NestedEnumProviderTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ProviderType | EnumProviderTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ProviderType[]
    notIn?: $Enums.ProviderType[]
    not?: NestedEnumProviderTypeWithAggregatesFilter<$PrismaModel> | $Enums.ProviderType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumProviderTypeFilter<$PrismaModel>
    _max?: NestedEnumProviderTypeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumConnectionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionType | EnumConnectionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionType[]
    notIn?: $Enums.ConnectionType[]
    not?: NestedEnumConnectionTypeFilter<$PrismaModel> | $Enums.ConnectionType
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumConnectionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionType | EnumConnectionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionType[]
    notIn?: $Enums.ConnectionType[]
    not?: NestedEnumConnectionTypeWithAggregatesFilter<$PrismaModel> | $Enums.ConnectionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectionTypeFilter<$PrismaModel>
    _max?: NestedEnumConnectionTypeFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type AIModelCreateWithoutProviderInput = {
    id?: string
    value: string
    label: string
  }

  export type AIModelUncheckedCreateWithoutProviderInput = {
    id?: string
    value: string
    label: string
  }

  export type AIModelCreateOrConnectWithoutProviderInput = {
    where: AIModelWhereUniqueInput
    create: XOR<AIModelCreateWithoutProviderInput, AIModelUncheckedCreateWithoutProviderInput>
  }

  export type AIModelCreateManyProviderInputEnvelope = {
    data: AIModelCreateManyProviderInput | AIModelCreateManyProviderInput[]
  }

  export type AIModelUpsertWithWhereUniqueWithoutProviderInput = {
    where: AIModelWhereUniqueInput
    update: XOR<AIModelUpdateWithoutProviderInput, AIModelUncheckedUpdateWithoutProviderInput>
    create: XOR<AIModelCreateWithoutProviderInput, AIModelUncheckedCreateWithoutProviderInput>
  }

  export type AIModelUpdateWithWhereUniqueWithoutProviderInput = {
    where: AIModelWhereUniqueInput
    data: XOR<AIModelUpdateWithoutProviderInput, AIModelUncheckedUpdateWithoutProviderInput>
  }

  export type AIModelUpdateManyWithWhereWithoutProviderInput = {
    where: AIModelScalarWhereInput
    data: XOR<AIModelUpdateManyMutationInput, AIModelUncheckedUpdateManyWithoutProviderInput>
  }

  export type AIModelScalarWhereInput = {
    AND?: AIModelScalarWhereInput | AIModelScalarWhereInput[]
    OR?: AIModelScalarWhereInput[]
    NOT?: AIModelScalarWhereInput | AIModelScalarWhereInput[]
    id?: StringFilter<"AIModel"> | string
    value?: StringFilter<"AIModel"> | string
    label?: StringFilter<"AIModel"> | string
    providerId?: StringFilter<"AIModel"> | string
  }

  export type AIProviderCreateWithoutModelsInput = {
    id?: string
    name: string
    type: $Enums.ProviderType
    apiUrl: string
    apiKey: string
    defaultModelValue: string
  }

  export type AIProviderUncheckedCreateWithoutModelsInput = {
    id?: string
    name: string
    type: $Enums.ProviderType
    apiUrl: string
    apiKey: string
    defaultModelValue: string
  }

  export type AIProviderCreateOrConnectWithoutModelsInput = {
    where: AIProviderWhereUniqueInput
    create: XOR<AIProviderCreateWithoutModelsInput, AIProviderUncheckedCreateWithoutModelsInput>
  }

  export type AIProviderUpsertWithoutModelsInput = {
    update: XOR<AIProviderUpdateWithoutModelsInput, AIProviderUncheckedUpdateWithoutModelsInput>
    create: XOR<AIProviderCreateWithoutModelsInput, AIProviderUncheckedCreateWithoutModelsInput>
    where?: AIProviderWhereInput
  }

  export type AIProviderUpdateToOneWithWhereWithoutModelsInput = {
    where?: AIProviderWhereInput
    data: XOR<AIProviderUpdateWithoutModelsInput, AIProviderUncheckedUpdateWithoutModelsInput>
  }

  export type AIProviderUpdateWithoutModelsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumProviderTypeFieldUpdateOperationsInput | $Enums.ProviderType
    apiUrl?: StringFieldUpdateOperationsInput | string
    apiKey?: StringFieldUpdateOperationsInput | string
    defaultModelValue?: StringFieldUpdateOperationsInput | string
  }

  export type AIProviderUncheckedUpdateWithoutModelsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumProviderTypeFieldUpdateOperationsInput | $Enums.ProviderType
    apiUrl?: StringFieldUpdateOperationsInput | string
    apiKey?: StringFieldUpdateOperationsInput | string
    defaultModelValue?: StringFieldUpdateOperationsInput | string
  }

  export type AIModelCreateManyProviderInput = {
    id?: string
    value: string
    label: string
  }

  export type AIModelUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
  }

  export type AIModelUncheckedUpdateWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
  }

  export type AIModelUncheckedUpdateManyWithoutProviderInput = {
    id?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}