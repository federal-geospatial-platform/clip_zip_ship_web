FROM ubuntu:jammy

RUN apt-get update
RUN apt-get install --no-install-recommends --no-install-suggests --allow-unauthenticated -y \
        jq curl awscli nginx-core
# Configure SSL on Image
RUN mkdir /gccp
COPY /ssl/get-ssl-cert.sh /gccp/get-ssl-cert.sh
COPY /ssl/run-get-ssl-cert.sh /gccp/run-get-ssl-cert.sh
RUN chmod +x /gccp/run-get-ssl-cert.sh
RUN chmod +x /gccp/get-ssl-cert.sh
RUN /gccp/run-get-ssl-cert.sh
RUN rm -rf /gccp
# Configure NGINX files
RUN unlink /etc/nginx/sites-enabled/default
ADD nginx/nginx.conf /etc/nginx/nginx.conf
ADD nginx/server-web /etc/nginx/sites-available/server-web
RUN ln -s /etc/nginx/sites-available/server-web /etc/nginx/sites-enabled/server-web

COPY . /usr/share/nginx/html
RUN rm /usr/share/nginx/html/Dockerfile
RUN rm -rf /usr/share/nginx/html/nginx /usr/share/nginx/html/ssl

# Set configuration for environment
ARG AWS_ENV=dev
COPY main-config-${AWS_ENV}.js /usr/share/nginx/html/main-config.js

EXPOSE 443/tcp

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
