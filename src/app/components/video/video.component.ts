import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { FaceApiService } from "src/app/resources/services/face-api.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-video",
  templateUrl: "./video.component.html",
  styleUrls: ["./video.component.css"]
})
export class VideoComponent implements OnInit {
  @ViewChild("videoPlayer") videoPlayer: ElementRef;
  @ViewChild("countTime") countTime: ElementRef;

  subscriptions = new Subscription();
  screenWidth: any;
  screenWidthHeightRatio = 0.5625; //0.5625
  userLabel = "";
  allowedWebcam = false;

  constructor(private faceapi: FaceApiService) {
    this.subscriptions.add(
      this.faceapi.userEmitted$.subscribe(label => (this.userLabel = label))
    );
  }

  ngOnInit(): void {
    this.getInnerWidth();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  updateShowField(count) {
    this.countTime.nativeElement.innerText = count;
  }

  getInnerWidth() {
    this.screenWidth = window.innerWidth / 2;
  }

  recordUser() {
    const images = [];
    const numberOfLoops = 20;

    for (let i = 0; i < numberOfLoops; i++) {
      setTimeout(() => {
        const snap = this.takeSnapshot();
        images.push(snap);

        if (i >= numberOfLoops - 1) {
          this.faceapi.saveCollectedImages(images);
        }

        const displayedValue = i >= numberOfLoops - 1 ? "Completed" : i;
        this.updateShowField(displayedValue);
      }, 100 * i);
    }

    this.faceapi.saveImageProperties(this.screenWidth);
  }

  takeSnapshot() {
    const hiddeCanvas = document.createElement("canvas");
    const context = hiddeCanvas.getContext("2d");
    const width = this.videoPlayer.nativeElement.offsetWidth;
    const height = this.videoPlayer.nativeElement.offsetHeight;

    if (width && height) {
      hiddeCanvas.width = this.screenWidth;
      hiddeCanvas.height = this.screenWidth * this.screenWidthHeightRatio;

      context.drawImage(this.videoPlayer.nativeElement, 0, 0, width, height);

      return hiddeCanvas.toDataURL("image/png");
    }
  }

  resetFaceApi() {
    this.faceapi.initFaceApi(this.videoPlayer.nativeElement);
  }

  startDetecting() {
    this.faceapi.startDetecting();
  }

  stopFaceApi() {
    this.faceapi.stopDetecting();
  }

  getWebCamAccess() {
    try {
      this.allowedWebcam = true;

      navigator.getUserMedia(
        {
          audio: false,
          video: {
            width: this.screenWidth,
            height: this.screenWidth * this.screenWidthHeightRatio
          }
        },
        stream => {
          this.videoPlayer.nativeElement.srcObject = stream;
          this.faceapi.initFaceApi(this.videoPlayer.nativeElement);

          this.videoPlayer.nativeElement.onloadedmetadata = () => {
            this.videoPlayer.nativeElement.play();
          };
        },
        err => {
          this.allowedWebcam = false;
          console.error(err);
        }
      );
    } catch (error) {
      this.allowedWebcam = false;
      console.error(error);
    }
  }
}
