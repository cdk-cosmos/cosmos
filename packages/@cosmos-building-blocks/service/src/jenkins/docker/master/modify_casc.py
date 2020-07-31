#!/usr/bin/env python

from jinja2 import Environment, FileSystemLoader
from os import getenv


def main():
    # This value comes as a build env var: `SSM_CONFIG_PARAM_NAME`
    _env = Environment(loader=FileSystemLoader('/'))
    _template = _env.get_template("/config-as-code.j2")
    _config_file = open("/config-as-code.yaml", "w")

    _config_file.write((_template.render(
        ECS_CLUSTER_ARN=getenv('cluster_arn'),
        AWS_REGION=getenv('aws_region'),
        JENKINS_URL=getenv('jenkins_url'),
        AGENT_TASK_DEF_ARN=getenv('agent_task_def_arn'),
        AGENT_SECURITY_GROUP_IDS=getenv('agent_security_group_ids'),
    )))

    _config_file.close()


if __name__ == '__main__':
    main()