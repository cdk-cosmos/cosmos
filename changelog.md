
## v0.9.4 (2023-01-12)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#342](https://github.com/cdk-cosmos/cosmos/pull/342) Enable IMDSv2 Support in ECS Stack ([@achakoteIAG](https://github.com/achakoteIAG))

#### Committers: 1
- Amit Chakote ([@achakoteIAG](https://github.com/achakoteIAG))


## v0.9.3 (2022-01-17)

#### 🐛 Bug Fix
* `@cosmos-building-blocks/pipeline`
  * [#332](https://github.com/cdk-cosmos/cosmos/pull/332) #331 fix GithubEnterpriseSourceAction trigger always true bug ([@thomasguerneyiag](https://github.com/thomasguerneyiag))

#### Committers: 1
- Tom Guerney ([@thomasguerneyiag](https://github.com/thomasguerneyiag))


## v0.9.2 (2021-11-24)

#### 🧹 Miscellaneous Chores
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#328](https://github.com/cdk-cosmos/cosmos/pull/328) #327 update to 1.134 ([@unerh](https://github.com/unerh))

#### Committers: 1
- Hakan Uner ([@unerh](https://github.com/unerh))


## v0.9.1 (2021-10-20)

#### 🧹 Miscellaneous Chores
* [#325](https://github.com/cdk-cosmos/cosmos/pull/325) #324 Adding documentation for contribution and missing release notes ([@unerh](https://github.com/unerh))

#### Committers: 1
- Hakan Uner ([@unerh](https://github.com/unerh))


## v0.9.0 (2021-10-18)

#### 🐛 Bug Fix
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/service`
  * [#322](https://github.com/cdk-cosmos/cosmos/pull/322) Fixing #309, #312 and #321 ([@unerh](https://github.com/unerh))

#### Committers: 1
- Hakan Uner ([@unerh](https://github.com/unerh))


## v0.8.12 (2021-07-20)

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/service`
  * [#308](https://github.com/cdk-cosmos/cosmos/pull/308) Bug/#305 cfn certs ([@unerh](https://github.com/unerh))

#### Committers: 2
- Hakan Uner ([@unerh](https://github.com/unerh))
- Tom Guerney ([@thomasguerneyiag](https://github.com/thomasguerneyiag))


## v0.8.11 (2021-06-22)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/pipeline`
  * [#298](https://github.com/cdk-cosmos/cosmos/pull/298) #241 cert bucket feature ([@thomasguerneyiag](https://github.com/thomasguerneyiag))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#299](https://github.com/cdk-cosmos/cosmos/pull/299) Bug: Disable Updates for GHE Connection Host ([@timpur](https://github.com/timpur))

#### Committers: 2
- Tim P ([@timpur](https://github.com/timpur))
- Tom Guerney ([@thomasguerneyiag](https://github.com/thomasguerneyiag))


## v0.8.10 (2021-06-18)

#### 🐛 Bug Fix
* `@cosmos-building-blocks/service`
  * [#296](https://github.com/cdk-cosmos/cosmos/pull/296) #294 merging host header config instead of duplicating it ([@unerh](https://github.com/unerh))

#### Committers: 2
- Hakan Uner ([@unerh](https://github.com/unerh))
- Tim P ([@timpur](https://github.com/timpur))


## v0.8.9 (2021-06-15)

#### 🚀 Enhancement:
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#291](https://github.com/cdk-cosmos/cosmos/pull/291) Add Ecs Capacity Provider ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#290](https://github.com/cdk-cosmos/cosmos/pull/290) Fix CDK Pipeline Trigger default enabled ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.8.8 (2021-05-28)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#284](https://github.com/cdk-cosmos/cosmos/pull/284) Add CFN-Singals for EC2 Update Rollovers ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#285](https://github.com/cdk-cosmos/cosmos/pull/285) Add ECS rebalance pattern for services ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#286](https://github.com/cdk-cosmos/cosmos/pull/286) Small bug with cfn-init not installed on ami ([@timpur](https://github.com/timpur))
  * [#284](https://github.com/cdk-cosmos/cosmos/pull/284) Add CFN-Singals for EC2 Update Rollovers ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#283](https://github.com/cdk-cosmos/cosmos/pull/283) Fix Pipeline Trigger Issue ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))










## v0.8.3 (2021-05-13)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#273](https://github.com/cdk-cosmos/cosmos/pull/273) ECS Login Bug + GHE trigger prop ([@timpur](https://github.com/timpur))
* `@cosmos-building-blocks/common`
  * [#272](https://github.com/cdk-cosmos/cosmos/pull/272) Clean up State Construct to use cfn param always ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#273](https://github.com/cdk-cosmos/cosmos/pull/273) ECS Login Bug + GHE trigger prop ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.8.2 (2021-04-29)

#### 🚀 Enhancement:
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#266](https://github.com/cdk-cosmos/cosmos/pull/266) Small fixes + circuitBreaker default enabled ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#269](https://github.com/cdk-cosmos/cosmos/pull/269) Fix Ecs Routing Priority Bug + Small Fixes ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.8.1 (2021-03-18)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`
  * [#251](https://github.com/cdk-cosmos/cosmos/pull/251) Config Pattern ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/pipeline`
  * [#252](https://github.com/cdk-cosmos/cosmos/pull/252) Fix GHE Source IAM Issue + Config Copy cross account Params ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`
  * [#251](https://github.com/cdk-cosmos/cosmos/pull/251) Config Pattern ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`
  * [#250](https://github.com/cdk-cosmos/cosmos/pull/250) Fix is type functions ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.8.0 (2021-03-11)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`
  * [#245](https://github.com/cdk-cosmos/cosmos/pull/245) Add State pattern + Closes [#243](https://github.com/cdk-cosmos/cosmos/issues/243) CodeCommit deletion policy ([@timpur](https://github.com/timpur))
* `@cosmos-building-blocks/service`
  * [#246](https://github.com/cdk-cosmos/cosmos/pull/246) Add Subdomain feature to ECS service ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`
  * [#244](https://github.com/cdk-cosmos/cosmos/pull/244) Add VPC Private Zone for Shared DNS Feature ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`, `@cosmos-building-blocks/common`
  * [#245](https://github.com/cdk-cosmos/cosmos/pull/245) Add State pattern + Closes [#243](https://github.com/cdk-cosmos/cosmos/issues/243) CodeCommit deletion policy ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))




## v0.7.3 (2021-02-01)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#233](https://github.com/cdk-cosmos/cosmos/pull/233) Add Redis Feature + Add Github Enterprise Feature + Fix Domain Feature + Fix CDK Pipeline Role issue + Fix Github Enterprise Connection ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#235](https://github.com/cdk-cosmos/cosmos/pull/235) Fix Fix Github Enterprise Webhook ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`
  * [#234](https://github.com/cdk-cosmos/cosmos/pull/234) Fix NS Record issue ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#233](https://github.com/cdk-cosmos/cosmos/pull/233) Add Redis Feature + Add Github Enterprise Feature + Fix Domain Feature + Fix CDK Pipeline Role issue + Fix Github Enterprise Connection ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.7.2 (2020-12-16)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`, `@cosmos-building-blocks/pipeline`
  * [#227](https://github.com/cdk-cosmos/cosmos/pull/227) Add Github Enterprise Support ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`
  * [#226](https://github.com/cdk-cosmos/cosmos/pull/226) Add Domain Feature + Link Feature + Rework Remote Exports ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/cdk-credentials-plugin`, `@cdk-cosmos/core`, `@cosmos-building-blocks/app-ec2`, `@cosmos-building-blocks/common`, `@cosmos-building-blocks/network`, `@cosmos-building-blocks/pipeline`, `@cosmos-building-blocks/service`
  * [#223](https://github.com/cdk-cosmos/cosmos/pull/223) Add Stack Dependencies and Fix cdk pipeline to accommodate change + CDK version bump ([@timpur](https://github.com/timpur))
* `@cdk-cosmos/core`, `@cosmos-building-blocks/service`
  * [#220](https://github.com/cdk-cosmos/cosmos/pull/220) Fix Redis prop issue + Add is functions to extension classes ([@timpur](https://github.com/timpur))

#### Committers: 1
- Tim P ([@timpur](https://github.com/timpur))


## v0.7.1 (2020-11-09)

#### 🚀 Enhancement:
* `@cdk-cosmos/core`
  * [#216](https://github.com/cdk-cosmos/cosmos/pull/216) Add Default user data (logging) + configure ecs agent ([@timpur](https://github.com/timpur))

#### 🐛 Bug Fix
* `@cdk-cosmos/core`
  * [#218](https://github.com/cdk-cosmos/cosmos/pull/218) Cross-Account export not handling pagination ([@timpur](https://github.com/timpur))
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
