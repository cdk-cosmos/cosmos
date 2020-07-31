FROM jenkins/inbound-agent

## todo: add in certificate
USER root

## install core packages
RUN apt-get update -y
RUN apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    jq \
    vim \
    git \
    iptables \
    gnupg2 \
    software-properties-common

## install ssh
RUN apt-get install -y --no-install-recommends openssh-client \
    && mkdir ~/.ssh \
    && touch ~/.ssh/known_hosts \
    && ssh-keyscan -t rsa,dsa -H github.com >> ~/.ssh/known_hosts \
    && ssh-keyscan -t rsa,dsa -H bitbucket.org >> ~/.ssh/known_hosts \
    && chmod 600 ~/.ssh/known_hosts

RUN rm -rf /var/lib/apt/lists/*
    

#****************  DOCKER  *********************************************
ENV DOCKER_BUCKET="download.docker.com" \
    DOCKER_CHANNEL="stable" \
    DIND_COMMIT="3b5fac462d21ca164b3778647420016315289034" \
    DOCKER_COMPOSE_VERSION="1.26.0" \
    SRC_DIR="/usr/src"

ENV DOCKER_SHA256="0f4336378f61ed73ed55a356ac19e46699a995f2aff34323ba5874d131548b9e"
ENV DOCKER_VERSION="19.03.11"

# Install Docker
RUN set -ex \
    && curl -fSL "https://${DOCKER_BUCKET}/linux/static/${DOCKER_CHANNEL}/x86_64/docker-${DOCKER_VERSION}.tgz" -o docker.tgz \
    && echo "${DOCKER_SHA256} *docker.tgz" | sha256sum -c - \
    && tar --extract --file docker.tgz --strip-components 1  --directory /usr/local/bin/ \
    && rm docker.tgz \
    && docker -v \
    # set up subuid/subgid so that "--userns-remap=default" works out-of-the-box
    && addgroup dockremap \
    && useradd -g dockremap dockremap \
    && echo 'dockremap:165536:65536' >> /etc/subuid \
    && echo 'dockremap:165536:65536' >> /etc/subgid \
    && wget -nv "https://raw.githubusercontent.com/docker/docker/${DIND_COMMIT}/hack/dind" -O /usr/local/bin/dind \
    && curl -L https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-Linux-x86_64 > /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/dind /usr/local/bin/docker-compose \
    # Ensure docker-compose works
    && docker-compose version

RUN groupadd docker \
    && usermod -aG docker jenkins

VOLUME /var/lib/docker
#*********************** END  DOCKER  ****************************

#*********************** Setup AWS Cli  ************************
RUN echo "install aws cli" \
    && cd /usr/src \
    && curl "https://s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "awscli-bundle.zip" \
    && unzip awscli-bundle.zip \
    && ./awscli-bundle/install -i /usr/local/aws -b /usr/local/bin/aws \
    && rm -rf /usr/src/aws*
#*********************** END Setup AWS Cli  *******************

#*********************** Setup Git ************************
COPY ./.gitconfig /home/jenkins/.gitconfig
#*********************** END  Setup Git  *******************
# Proxy will be set at docker master via config as code

COPY ./start_jenkins_agent.sh /start_jenkins_agent.sh
ENTRYPOINT ["/start_jenkins_agent.sh"]

