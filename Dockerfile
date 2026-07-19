# Digest-pinned so a tag repoint cannot swap the base image (node:24-alpine, 2026-07-18).
FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd
WORKDIR /organism
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["npm", "start"]
