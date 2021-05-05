FROM debian:testing
# MAINTAINER Danijel Koržinek <danijel.korzinek@pja.edu.pl>

RUN apt-get update && \
    apt-get install -y python3 python3-pip git libavdevice-dev libavfilter-dev libopus-dev libvpx-dev pkg-config &&\
    apt-get clean && apt-get autoclean

RUN pip3 install aiortc aiohttp aiohttp-middlewares

RUN git clone https://github.com/RevoluChessOrg/KaldiWebrtcServer /server

ENTRYPOINT ["python3","/server/server.py"]
CMD ["--servers","/server/servers.json"]
