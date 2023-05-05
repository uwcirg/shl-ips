document.write(`
		<div class="headerContainer" style="background-color: rgb(249, 249, 249); border-bottom: 1px solid rgb(204, 204, 204);">
			<div class="fluid-container">
				<div class="subheaderContainer">
					<div style="display: flex; flex-wrap: wrap; justify-content: space-between; min-height: 70px;">
						<div style="display: flex; align-items: center;">
							<div>
								<img class="doh_logo_doh-black" alt="Washington State Department of Health Logo" width="240px" src="${imgPath}/doh_logo_doh-black.png">
							</div>
							<!--<div style="vertical-align: middle;">Washington State<br>Department of Health</div>-->
						</div>
						<!--This is the section added-->
						<div class="translationContainer" style="display: flex; align-items: center;">
							<button class="MuiButtonBase-root MuiButton-root MuiButton-text" tabindex="0" type="button" aria-controls="simple-menu" aria-haspopup="true" style="font-weight: 400; padding: 5px 5px 5px; margin-right: 20px; text-transform: none;">login</button>
							<div>
								<img class="menu" style="margin-right: 20px;" alt="menu" width="24px" src="${imgPath}/menu.png">
							</div>
								
								<span class="MuiTouchRipple-root"></span>
							</button>
						</div>
						<!--This is the section added-->
					</div>
				</div>
			</div>
		</div>
		<div class="logo-nav-container" style="border-bottom: 1px solid rgb(204, 204, 204);">
			<div class="fluid-container">
				<div class="vaccineLogo" style="padding: 5px 1.5vw;">
					<div style="display: flex; align-items: center;">
						<div>
							<img alt="WaVerify Logo" width="200px" src="${imgPath}/waverifylogo.png" style="align-self: center;">
						</div>
						<div style="vertical-align: middle; font-size: 18px; display: inline-block; padding-left: 17px; font-family: Verdana, sans-serif; color: rgb(34, 72, 156);">WA Verify International Patient Summary Viewer</div>
						</div>
					
				</div>
			</div>
		</div>
		<div>
			<h1 style="padding-left: 17px; font-size: 38px; font-weight: 200; font-family: Verdana, sans-serif; color: rgb(200, 76, 14); margin: 50px 0px;">WA Verify International Patient Summary Viewer</h1>
		</div>
`);