import * as frame from "ui/frame";
import * as trace from "trace";
import * as fs from "file-system";
import * as types from "utils/types";
import { Color } from "color";
import { View, layout, Property } from "ui/core/view";
let listener;
export class VideoRecorder {
	record(options = { saveToGallery: false, hd: false, format: 'default', position: 'back', size: 0, duration: 0 }): Promise<any> {
		return new Promise((resolve, reject) => {
			listener = null;
			let picker = UIImagePickerController.new();
			let sourceType = UIImagePickerControllerSourceType.Camera;
			picker.mediaTypes = <any>[kUTTypeMovie];
			picker.sourceType = sourceType;
			options.saveToGallery = Boolean(options.saveToGallery) ? true : false;
			options.hd = Boolean(options.hd) ? true : false;
			picker.cameraCaptureMode = UIImagePickerControllerCameraCaptureMode.Video;

			picker.allowsEditing = false;
			picker.videoQuality = options.hd ? UIImagePickerControllerQualityType.TypeHigh : UIImagePickerControllerQualityType.TypeLow;

			picker.videoMaximumDuration = (types.isNumber(options.duration) && options.duration > 0) ? Number(options.duration) : Number.POSITIVE_INFINITY;

			if (options && options.saveToGallery) {
				let authStatus = PHPhotoLibrary.authorizationStatus();
				if (authStatus === PHAuthorizationStatus.Authorized) {
					options.saveToGallery = true;
				}
			}

			if (options) {
				listener = UIImagePickerControllerDelegateImpl.initWithOwnerCallbackOptions(new WeakRef(this), resolve, options);
			} else {
				listener = UIImagePickerControllerDelegateImpl.initWithCallback(resolve);
			}

			picker.delegate = listener;
			picker.modalPresentationStyle = UIModalPresentationStyle.CurrentContext;

			let topMostFrame = frame.topmost();
			if (topMostFrame) {
				let viewController = topMostFrame.currentPage && topMostFrame.currentPage.ios;
				if (viewController) {
					viewController.presentViewControllerAnimatedCompletion(picker, true, null);
				}
			}

		});
	}
}
export type VideoFormat = 'default' | 'mp4';
class UIImagePickerControllerDelegateImpl extends NSObject implements UIImagePickerControllerDelegate {
	public static ObjCProtocols = [UIImagePickerControllerDelegate];
	private _saveToGallery: boolean;
	private _callback: (result?) => void;
	private _format: VideoFormat = "default";
	private _hd: boolean;
	public static initWithCallback(callback: (result?) => void): UIImagePickerControllerDelegateImpl {
		let delegate = new UIImagePickerControllerDelegateImpl();
		delegate._callback = callback;
		return delegate;
	}
	public static initWithOwnerCallbackOptions(owner: any /*WeakRef<VideoRecorder>*/, callback: (result?) => void, options?: any): UIImagePickerControllerDelegateImpl {
		let delegate = new UIImagePickerControllerDelegateImpl();
		if (options) {
			delegate._saveToGallery = options.saveToGallery;
			delegate._format = options.format;
			delegate._hd = options.hd;
		}
		delegate._callback = callback;
		return delegate;
	}
	imagePickerControllerDidCancel(picker: any /*UIImagePickerController*/) {
		picker.presentingViewController.dismissViewControllerAnimatedCompletion(true, null);
		listener = null;
	}

	imagePickerControllerDidFinishPickingMediaWithInfo(picker: any /*UIImagePickerController*/, info: any /*NSDictionary<string, any>*/) {
		if (info) {
			let currentDate: Date = new Date();
			if (this._saveToGallery) {
				let source = info.objectForKey(UIImagePickerControllerMediaURL);
				if (this._format === "mp4") {
					let asset = AVAsset.assetWithURL(source);
					let preset = this._hd ? AVAssetExportPresetHighestQuality : AVAssetExportPresetLowQuality;
					let session = AVAssetExportSession.exportSessionWithAssetPresetName(asset, preset);
					session.outputFileType = AVFileTypeMPEG4;
					let fileName = `videoCapture_${+new Date()}.mp4`;
					let path = fs.path.join(fs.knownFolders.documents().path, fileName);
					let nativePath = NSURL.fileURLWithPath(path);
					session.outputURL = nativePath;
					session.exportAsynchronouslyWithCompletionHandler(() => {
						let assetLibrary = ALAssetsLibrary.alloc().init();
						assetLibrary.writeVideoAtPathToSavedPhotosAlbumCompletionBlock(nativePath, (file, error) => {
							if (!error) {
								this._callback();
							}
							fs.File.fromPath(path).remove();
						});
					});

				} else {
					let assetLibrary = ALAssetsLibrary.alloc().init();
					assetLibrary.writeVideoAtPathToSavedPhotosAlbumCompletionBlock(source, (file, error) => {
						if (!error) {
							this._callback();
						} else {
							console.log(error.localizedDescription);
						}
					});
				}
			} else {
				let source = info.objectForKey(UIImagePickerControllerMediaURL);
				if (this._format === "mp4") {
					let asset = AVAsset.assetWithURL(source);
					let preset = this._hd ? AVAssetExportPresetHighestQuality : AVAssetExportPresetLowQuality;
					let session = AVAssetExportSession.exportSessionWithAssetPresetName(asset, preset);
					session.outputFileType = AVFileTypeMPEG4;
					let fileName = `videoCapture_${+new Date()}.mp4`;
					let path = fs.path.join(fs.knownFolders.documents().path, fileName);
					let nativePath = NSURL.fileURLWithPath(path);
					session.outputURL = nativePath;
					session.exportAsynchronouslyWithCompletionHandler(() => {
						fs.File.fromPath(source.path).remove();
						this._callback({ file: path });
					});
				} else {
					this._callback({ file: source.path });
				}
			}
			picker.presentingViewController.dismissViewControllerAnimatedCompletion(true, null);
			listener = null;
		}
	};
}
export type CameraPosition = 'front' | 'back';
export var requestPermissions = function (): Promise<any> {
	return new Promise((resolve, reject) => {
		let authStatus = PHPhotoLibrary.authorizationStatus();
		if (authStatus === PHAuthorizationStatus.NotDetermined) {
			PHPhotoLibrary.requestAuthorization((auth) => {
				if (auth === PHAuthorizationStatus.Authorized) {
					resolve();
				}
			})
		} else if (authStatus !== PHAuthorizationStatus.Authorized) {
			reject();
		}
	});
}