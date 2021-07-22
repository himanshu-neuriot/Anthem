FROM registry.redhat.io/rhel8/nodejs-12:1-90 AS server-build
RUN yum update && yum add python make g++
WORKDIR /root/
COPY package*.json ./
RUN npm install
COPY index.js .
COPY api api/
COPY config config/
COPY lib lib/
COPY services services/
COPY setPasswordHTMLFiles setPasswordHTMLFiles/
COPY utils utils/


EXPOSE 4600

CMD ["node", "index.js"]