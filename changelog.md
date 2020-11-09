
## v0.7.1 (2020-11-09)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#216](https://github.com/cdk-cosmos/cosmos/pull/216) Add Default user data (logging) + configure ecs agent ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#213](https://github.com/cdk-cosmos/cosmos/pull/213) Fix @aws-cdk/aws-kms peer dependency ([@jpeyper](https://github.com/jpeyper))

#### Committers: 2
- Jonathan Peyper ([@jpeyper](https://github.com/jpeyper))
- Tim P ([@timpur](https://github.com/timpur))


## v0.7.0 (2020-10-15)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#209](https://github.com/cdk-cosmos/cosmos/pull/209) ECS ROLLING_UPDATE ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`
  * [#208](https://github.com/cdk-cosmos/cosmos/pull/208) New CDKBootstrap + CDKToolkit  ([@timpur](https://github.com/timpur))

#### Committers: 2
- Tim P ([@timpur](https://github.com/timpur))
- Tom Guerney ([@thomasguerneyiag](https://github.com/thomasguerneyiag))


## v0.6.4 (2020-09-24)

#### 🚀 Enhancement:
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#202](https://github.com/cdk-cosmos/cosmos/pull/202) Add Kms Key for ECS topic encryption ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#200](https://github.com/cdk-cosmos/cosmos/pull/200) Add highAvailabilityMode to Redis + Add Change Dir to CDK Pipeline + Add Support for http and https listeners + https redirect for Ecs Service ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#205](https://github.com/cdk-cosmos/cosmos/pull/205) Fix kms key for cross stack use ([@timpur](https://github.com/timpur))
  * [#203](https://github.com/cdk-cosmos/cosmos/pull/203) Fix Deprecated Tag interface 6a704be ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.6.3 (2020-09-04)

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#192](https://github.com/cdk-cosmos/cosmos/pull/192) Fix Lib Version export name for extensions ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.6.2 (2020-09-02)

#### 🚀 Enhancement:
* `@cdk-cosmos/cdk-credentials-plugin`
  * [#184](https://github.com/cdk-cosmos/cosmos/pull/184) Enhance cdk-credentials-plugin to support different Role Names #169 ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`
  * [#183](https://github.com/cdk-cosmos/cosmos/pull/183) #168 Move code repo into cicd feature ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#182](https://github.com/cdk-cosmos/cosmos/pull/182) Show Diff in CDK Pipeline before deploying #179 + Core-Cdk-Pipeline add Prod as a separate stage #78 ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`
  * [#181](https://github.com/cdk-cosmos/cosmos/pull/181) Fix Cross Account assume in Master Role + Fix Ecs import issue with bad output names ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.6.1 (2020-08-19)

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#176](https://github.com/cdk-cosmos/cosmos/pull/176) Fix ASG prop for ECS ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/network`
  * [#175](https://github.com/cdk-cosmos/cosmos/pull/175) Fix Typeo in CiCd Extension Stack + Expose using vpc for cdk pipeline ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.6.0 (2020-08-17)

#### 💥 Breaking Change:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`
  * [#167](https://github.com/cdk-cosmos/cosmos/pull/167) Breaking Change: Feature Pattern for extending Constructs ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`
  * [#166](https://github.com/cdk-cosmos/cosmos/pull/166) Clean up Logical Ids + General Clean up ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`, `private`
  * [#157](https://github.com/cdk-cosmos/cosmos/pull/157) Fix cross account exports (Deprecated AWS CDK Package) ([@timpur](https://github.com/timpur))

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#171](https://github.com/cdk-cosmos/cosmos/pull/171) Clean up Naming + .of and .is static funtions to find constructs ([@timpur](https://github.com/timpur))
* `@cosmos-building-blocks/common`, `@cosmos-building-blocks/service`
  * [#160](https://github.com/cdk-cosmos/cosmos/pull/160) Add EC2 Cloud Watch Agent (#158) ([@timpur](https://github.com/timpur))
* `@cosmos-building-blocks/service`
  * [#162](https://github.com/cdk-cosmos/cosmos/pull/162) ASG construct with ability to use Launch Template ([@jbnaik](https://github.com/jbnaik))
  * [#155](https://github.com/cdk-cosmos/cosmos/pull/155) Added Redis Building block ([@jbnaik](https://github.com/jbnaik))
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#156](https://github.com/cdk-cosmos/cosmos/pull/156) Update AWS CDK + Default ASG for ECS ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#166](https://github.com/cdk-cosmos/cosmos/pull/166) Clean up Logical Ids + General Clean up ([@timpur](https://github.com/timpur))

#### Committers: 2
- Tim P ([@timpur](https://github.com/timpur))
- [@jbnaik](https://github.com/jbnaik)


## v0.5.4 (2020-07-16)

#### 🐛 Bug Fix
* `private`
  * [#148](https://github.com/cdk-cosmos/cosmos/pull/148) Fix missing node modules in cross account fn (bundle issue) ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.5.3 (2020-07-14)

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`, `private`
  * [#146](https://github.com/cdk-cosmos/cosmos/pull/146) Bug Fixes: Typeo in Remote Imports, Default Privileged mode for Docker Pipeline, Bundle Issue in Cross Account Stack Ref Fn ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.5.2 (2020-07-07)

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/service`
  * [#143](https://github.com/cdk-cosmos/cosmos/pull/143) Fix portal scope issue ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#142](https://github.com/cdk-cosmos/cosmos/pull/142) A Couple of Small Fixes ( Pipeline repo cross stack + Alb dns export issue) ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.5.1 (2020-07-01)

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#140](https://github.com/cdk-cosmos/cosmos/pull/140) Fix typescript typing issue from refactor in v0.5.0 ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.5.0 (2020-07-01)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#100](https://github.com/cdk-cosmos/cosmos/pull/100) 0.5.x Refactor Code  ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#101](https://github.com/cdk-cosmos/cosmos/pull/101) Refactor pipelines + StandardPipeline + BuildSpecBuilder ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/service`
  * [#99](https://github.com/cdk-cosmos/cosmos/pull/99) Add SecureBucket building block ([@jbnaik](https://github.com/jbnaik))

#### Committers: 2
- Tim P ([@timpur](https://github.com/timpur))
- [@jbnaik](https://github.com/jbnaik)


## v0.4.5 (2020-06-30)

#### 🚀 Enhancement:
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`, `private`
  * [#135](https://github.com/cdk-cosmos/cosmos/pull/135) Add Changelog + Release Actions ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.4.4 (2020-06-19)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#96](https://github.com/cdk-cosmos/cosmos/pull/96) Allow for Extension to target the same core multiple times ([@timpur](https://github.com/timpur))
  * [#97](https://github.com/cdk-cosmos/cosmos/pull/97) Add option for ssl ([@jbnaik](https://github.com/jbnaik))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#96](https://github.com/cdk-cosmos/cosmos/pull/96) Allow for Extension to target the same core multiple times ([@timpur](https://github.com/timpur))
  * [#93](https://github.com/cdk-cosmos/cosmos/pull/93) #92 - Added missing default endpoints ([@timpur](https://github.com/timpur))
  * [#90](https://github.com/cdk-cosmos/cosmos/pull/90) Fix Galaxy Tag ([@timpur](https://github.com/timpur))

#### Committers: 3
- Tim P ([@timpur](https://github.com/timpur))
- [@abitofoldtom](https://github.com/abitofoldtom)
- [@jbnaik](https://github.com/jbnaik)


## v0.4.3 (2020-06-01)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#88](https://github.com/cdk-cosmos/cosmos/pull/88) Add Cosmos Cdk Tagging ([@timpur](https://github.com/timpur))
* `@cosmos-building-blocks/network`
  * [#87](https://github.com/cdk-cosmos/cosmos/pull/87) Add Transparent Proxy in front of a proxy ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.4.2 (2020-05-13)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/service`
  * [#84](https://github.com/cdk-cosmos/cosmos/pull/84) Fix importing vpc for extensions for multiple subnet groups + Ecs Service fixes ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/service`
  * [#84](https://github.com/cdk-cosmos/cosmos/pull/84) Fix importing vpc for extensions for multiple subnet groups + Ecs Service fixes ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.4.0 (2020-05-07)

#### 💥 Breaking Change:
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#83](https://github.com/cdk-cosmos/cosmos/pull/83) v0.4x Refactor To use Context + Custom Logical Id's ([@timpur](https://github.com/timpur))

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/service`
  * [#80](https://github.com/cdk-cosmos/cosmos/pull/80) Improvements for Ecs + CiCd + Imported Vpcs ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))
