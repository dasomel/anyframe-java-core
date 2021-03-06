﻿//XJS=comFile.xjs
(function()
{
    return function(path)
    {
        var obj;
    
        // User Script
        this.registerScript(path, function() {
        this._FORM_FILE_OBJ = null;

        /**
         * @class 파일초기설정
         * @param oForm : form object
         * @param oCallBack : callback 함수 object
         * @param bBinary : BLOB여부(true:blob, false:ftp)
         * @param bMultiSelect : 다중파일 업로드여부(true:multi, false:single)
         * @return None
         */ 
        this.gfn_initFile = function(oForm,oCallBack,bBinary,bMultiSelect)
        {
        	//FileUpload컴포넌트 생성	
        	var sFileUpload = "_tempFileUpload";
        	var oFileUpload = Eco.XComp.query(this, "typeOf == 'FileUpload' && prop[name] == '"+sFileUpload+"'")[0];
        	if(Eco.isEmpty(oFileUpload))
        	{
        		oFileUpload = new FileUpload(sFileUpload);
        		this.addChild(sFileUpload, oFileUpload);
        		oFileUpload.addEventHandler("onitemchanged", this._gfn_fileUploadOnItemChanged, this);
        		oFileUpload.addEventHandler("onsuccess", this._gfn_fileUploadOnSuccess, this);
        		oFileUpload.show();
        	}
        		
        	//FileDownload컴포넌트 생성	
        	var sFileDownload = "_tempFileDownload";
        	var oFileDownload = Eco.XComp.query(this, "typeOf == 'FileDownload' && prop[name] == '"+sFileDownload+"'")[0];
        	if(Eco.isEmpty(oFileDownload))
        	{
        		oFileDownload = new FileDownload(sFileDownload);
        		this.addChild(sFileDownload, oFileDownload);
        		oFileDownload.addEventHandler("onerror", this._gfn_fileDownloadOnError, this);
        		oFileDownload.addEventHandler("onsuccess", this._gfn_fileDownloadOnSuccess, this);
        		oFileDownload.show();
        	}
        			
        	//데이타셋 생성
        	var sFileDataset = "_tempFileDataset";
        	var oFileDataset = Eco.XComp.query(this, "typeOf == 'Dataset' && prop[name] == '"+sFileDataset+"'")[0];
        	if(Eco.isEmpty(oFileDataset))
        	{
        		oFileDataset = new Dataset(sFileDataset);
        		this.addChild(sFileDataset, oFileDataset);
        		
        		oFileDataset.addColumn("FILE_ID", "string");
        		oFileDataset.addColumn("FILE_NM", "string");
        	}	
        	
        	//ftp or binary 설정
        	if(Eco.isEmpty(bBinary)) bBinary = false;
        			
        	//single or multi select 설정
        	if(Eco.isEmpty(bMultiSelect)) bMultiSelect = false;	
        	if(bMultiSelect) oFileUpload.set_multiselect(true);
        	else			 oFileUpload.set_multiselect(false);

        	//upload path설정	
        	var sUploadPath, sUrl;
        	var oFormDiv = null;
        	
        	try{
        		oFormDiv = oForm.getOwnerFrame().form.div_work;
        		sUrl = oFormDiv.url;
        	}catch(e){
        		oFormDiv = oForm.getOwnerFrame();
        		sUrl = oFormDiv.formurl;
        	}
        	sUrl = sUrl.replace("::","\\");
        	sUploadPath = sUrl.substr(0,sUrl.lastIndexOf(".xfdl"));
        		
        	//파라미터 저장
        	this._FORM_FILE_OBJ = null;
        	this._FORM_FILE_OBJ = {};
        	this._FORM_FILE_OBJ.form = oForm;
        	this._FORM_FILE_OBJ.callback = oCallBack;
        	this._FORM_FILE_OBJ.binary = bBinary;
        	this._FORM_FILE_OBJ.multi = bMultiSelect;
        	this._FORM_FILE_OBJ.uploadpath = sUploadPath;
        	this._FORM_FILE_OBJ.fileupload = oFileUpload;
        	this._FORM_FILE_OBJ.filedownload = oFileDownload;
        	this._FORM_FILE_OBJ.filedataset = oFileDataset;	
        }

        /**
         * @class 파일조회
         * @param sFileId : file 그룹ID
         * @param sFileSeq : file 그룹ID내 파일seq값
         * @return None
         */ 
        this.gfn_searchFile = function(sFileId,sFileSeq)
        {
        	var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        	
        	if(Eco.isEmpty(sFileId))
        	{
        		oFileDataset.clearData();
        		return false;
        	}
        	
        	sFileId = Eco.iif(Eco.isEmpty(sFileId), "", sFileId);
        	sFileSeq = Eco.iif(Eco.isEmpty(sFileSeq), "", sFileSeq);
        	trace("sFileId = " + sFileId);
        	trace("sFileSeq = " + sFileSeq);
        	this.fsp_clear();
        	this.fsp_addSearch("comm/cs:cs_multifile_ftp_s01");
        	this.fsp_callSvc(
        		"DkuAction"
        		, "gfn_searchFile"			//svcId
        		, "ds_in=ds_cond"	//inDs
        		, oFileDataset.name+"=ds_out"	//outDS
        		, "FILE_ID=" + sFileId+" SEQ="+sFileSeq
        		, "_gfn_callbackSearchFile"		//callBackFnc
        	);
        }

        this._gfn_callbackSearchFile = function(strSvcID,nErrorCode,strErrorMag)
        {
        	if(nErrorCode < 0)
        	{
        		this.gfn_alert("파일조회중 오류가 발생하였습니다.\n관리자에게 문의하세요.");
        		this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "search_file", false);
        		return;
        	}
        	var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        	var sRtn = oFileDataset.saveXML();
        	this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "search_file", sRtn);
        }

        /**
         * @class 파일추가
         * @return None
         */ 
        this.gfn_addFile = function()
        {		
        	//한건인 경우 삭제 후 추가하도록 유도
        	if(!this._FORM_FILE_OBJ.multi)
        	{
        		if(this._FORM_FILE_OBJ.filedataset.rowcount == 1)
        		{
        			this.gfn_alert("파일이 추가할 수 없습니다.\n(단, 변경할 경우 삭제 후 다시 파일을 추가해주세요.)");
        			this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "add_file", false);
        			return false;
        		}
        	}	
        	
        	//파일추가
        	var oFileUpload = this._FORM_FILE_OBJ.fileupload;
        	oFileUpload.appendItem();
        	var nFileCnt = oFileUpload.getItemCount() - 1;
        	oFileUpload._items[nFileCnt].fileitembutton.click();
        }

        this._gfn_fileUploadOnItemChanged = function(obj,e)
        {
        	var sFullPath = obj.value;
        	if(sFullPath == null || sFullPath == "" ) {
        		obj.deleteItem(obj.index);
        		return;
        	}
        	
        	var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        	
        	var sFileName;
        	var sDirExpt;
        	var sFileSplitFlag = sFullPath.substr(0, sFullPath.indexOf("\:\\")+2);
        	var sFileArray = sFullPath.split(sFileSplitFlag);
        	sFileArray = sFileArray.splice(1, sFileArray.length);
        	
        	for(var i = 0; i < sFileArray.length ; i++){
        		if(i < sFileArray.length-1){
        			sFileArray[i] = sFileArray[i].substr(0, sFileArray[i].length-1);
        		}
        		sDirExpt = sFileArray[i].lastIndexOf("\\")+1;
        		sFileName = sFileArray[i].substr(sDirExpt);
        		
        		var nRow = oFileDataset.addRow();		
        		//있으면 입력, 없으면 저장시 신규발급
        		var sFileId = oFileDataset.getColumn(0, "FILE_ID");
        		if(!Eco.isEmpty(sFileId))
        		{
        			oFileDataset.setColumn(nRow, "FILE_ID", sFileId);
        		}		
        		oFileDataset.setColumn(nRow, "FILE_NM", sFileName);	
        	}
        	//데이타셋 리턴
        	var sRtn = oFileDataset.saveXML();
        	this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "add_file", sRtn);
        }

        /**
         * @class 파일업로드
         * @return None
         */ 
        this.gfn_uploadFile = function()
        {	
        	var sFileId = this._FORM_FILE_OBJ.filedataset.getColumn(0, "FILE_ID");
        	if(Eco.isEmpty(sFileId)) sFileId = "";
        	
        	//FTP 업로드
        	if(!this._FORM_FILE_OBJ.binary)
        	{
        		strUrl = "svc::UploadServlet?PATH=" + this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId;
        	}
        	//Binary 업로드
        	else
        	{
        		strUrl = "svc::ConvertServlet?PATH=" + this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId;
        	}
        	this._FORM_FILE_OBJ.fileupload.upload(strUrl);
        }

        this._gfn_fileUploadOnSuccess = function(obj,e)
        {
        	if( e.datasets == null || e.errorcode < 0 ){
        		this.gfn_alert("파일업로드 오류가 발생하였습니다.\n관리자에게 문의하세요.");
        		this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "upload_file", false);
        		return;
        	}else{
        		//fileupload item 초기화		
        		var nLoopCnt = obj.getItemCount();
        		for(var i = nLoopCnt-1; i >= 0; i--)
        		{
        			obj.deleteItem(i);
        		}
        		
        		var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        		oFileDataset.copyData(e.datasets[0]);
        		
        		var sFileId = oFileDataset.getColumn(0, "FILE_ID");
        		
        		if(!Eco.isEmpty(sFileId))
        		{			
        			var sRtn = oFileDataset.saveXML();
        			this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "upload_file", sRtn);
        		}
        		else
        		{
        			this.gfn_alert("파일ID를 생성하지 못했습니다.\n관리자에게 문의하세요.");
        			this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "upload_file", false);
        		}
        	}
        }

        /**
         * @class 파일삭제
         * @param dsObj : 데이타셋 object
         * @return None
         */ 
        this.gfn_deleteFile = function(dsObj)
        {	
        	var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        	//단건인경우
        	if(Eco.isEmpty(dsObj))
        	{
        		var sFileId = oFileDataset.getColumn(0, "FILE_ID");
        		if(!Eco.isEmpty(sFileId))
        		{
        			oFileDataset.setColumn(0, "CHK", '1');
        		}
        	}
        	//다건인경우
        	else
        	{
        		for(var i = 0; i < dsObj.rowcount; i++)
        		{
        			if(dsObj.getColumn(i, "CHK") == '1')
        			{
        				oFileDataset.setColumn(i, "CHK", '1');
        			}
        			else
        			{
        				oFileDataset.setColumn(i, "CHK", '0');
        			}
        		}
        	}
        	var serviceURL = "svc::DeleteServlet?PATH="+this._FORM_FILE_OBJ.uploadpath;
        	this.transaction("delete", serviceURL, "ds_in="+oFileDataset.name+":u", oFileDataset.name+"=ds_out", "", "_gfn_callbackDeleteFile"); 
        }

        this._gfn_callbackDeleteFile = function(strSvcID,nErrorCode,strErrorMag)
        {
        	if(nErrorCode < 0)
        	{
        		this.gfn_alert("파일삭제중 오류가 발생하였습니다.\n관리자에게 문의하세요.");
        		this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "delete_file", false);
        		return;
        	}
        	var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        	var sRtn = oFileDataset.saveXML();
        	this._FORM_FILE_OBJ.callback.call(this._FORM_FILE_OBJ.form, "delete_file", sRtn);
        }

        /**
         * @class 파일다운로드
         * @param dsObj : 데이타셋 object
         * @return None
         */ 
        this.gfn_downloadFile = function(dsObj)
        {
        	var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        	//단건인경우
        	if(Eco.isEmpty(dsObj))
        	{
        		var sFileId = oFileDataset.getColumn(0, "FILE_ID");
        		if(!Eco.isEmpty(sFileId))
        		{
        			oFileDataset.setColumn(0, "CHK", '1');
        		}
        	}
        	//다건인경우
        	else
        	{
        		var nChkCnt = dsObj.getCaseCount("CHK=='1'");
        		if(nChkCnt < 1){
        			this.gfn_alert("파일을 선택하세요");
        			return;
        		}
        		for(var i = 0; i < dsObj.rowcount; i++)
        		{
        			if(dsObj.getColumn(i, "CHK") == '1')
        			{
        				oFileDataset.setColumn(i, "CHK", '1');
        			}
        			else
        			{
        				oFileDataset.setColumn(i, "CHK", '0');
        			}
        		}
        	}
        	
        	var sFileId;
        	var sFileSeq;
        	var sFileName;
        	var oFileDownload = this._FORM_FILE_OBJ.filedownload;
        	
        	for(var i = 0; i<oFileDataset.getRowCount(); i++)
        	{
        		if(oFileDataset.getColumn(i,"CHK")==1)
        		{
        			sFileName = oFileDataset.getColumn(i, "FILE_NM");
        			sFileId = oFileDataset.getColumn(i, "FILE_ID");
        			sFileSeq = oFileDataset.getColumn(i, "SEQ");

        			oFileDownload.set_downloadfilename(sFileName);
        			if(!this._FORM_FILE_OBJ.binary)
        			{
        				oFileDownload.set_downloadurl("svc::DownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq);
        			}
        			else
        			{
        				oFileDownload.set_downloadurl("svc::BinaryDownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq);
        			}
        			try{
        				var bSucc = oFileDownload.download();
        			} catch (e){
        				trace(e);
        				this.gfn_alert("파일다운로드에 실패하였습니다.");
        			}
        		}
        	}	
        }

        /**
         * @class 단건파일다운로드
         * @param sFileId : 파일ID
         * @param sFileSeq : 파일SEQ(기본값 1)
         * @param sFileName : 파일명
         * @return None
         */ 
        this.gfn_downloadFileSingle = function(sFileId,sFileSeq,sFileName)
        {
        	if(Eco.isEmpty(sFileId)) return false;
        	
        	if(Eco.isEmpty(sFileSeq)) sFileSeq = '1';

        	if(Eco.isEmpty(sFileName)) sFileName = Eco.date.getMaskFormatString(new Date(), "yyyyMMddmmss");

        	var oFileDownload = this._FORM_FILE_OBJ.filedownload;
        	
        	oFileDownload.set_downloadfilename(sFileName);
        	
        	if(!this._FORM_FILE_OBJ.binary)
        	{
        		oFileDownload.set_downloadurl("svc::DownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq);
        	}
        	else
        	{
        		oFileDownload.set_downloadurl("svc::BinaryDownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq);
        	}
        	try{
        		var bSucc = oFileDownload.download();
        	} catch (e){
        		trace(e);
        		this.gfn_alert("파일다운로드에 실패하였습니다.");
        	}
        }

        this._gfn_fileDownloadOnError = function(obj,e)
        {
        	trace("_gfn_fileDownloadOnError");
        }

        this._gfn_fileDownloadOnSuccess = function(obj,e)
        {
        	trace("_gfn_fileDownloadOnSuccess");
        }

        
        /**
         * @class 파일실행
         * @param dsObj : 데이타셋 object
         * @return None
         */ 
        this.gfn_executeFile = function(dsObj)
        {
        	var oFileDataset = this._FORM_FILE_OBJ.filedataset;
        	//단건인경우
        	if(Eco.isEmpty(dsObj))
        	{
        		var sFileId = oFileDataset.getColumn(0, "FILE_ID");
        		if(!Eco.isEmpty(sFileId))
        		{
        			oFileDataset.setColumn(0, "CHK", '1');
        		}
        	}
        	//다건인경우
        	else
        	{
        		var nChkCnt = dsObj.getCaseCount("CHK=='1'");
        		if(nChkCnt < 1){
        			this.gfn_alert("파일을 선택하세요");
        			return;
        		}
        		for(var i = 0; i < dsObj.rowcount; i++)
        		{
        			if(dsObj.getColumn(i, "CHK") == '1')
        			{
        				oFileDataset.setColumn(i, "CHK", '1');
        			}
        			else
        			{
        				oFileDataset.setColumn(i, "CHK", '0');
        			}
        		}
        	}
        	
        	var sFileId;
        	var sFileSeq;	
        	for(var i = 0; i<oFileDataset.getRowCount(); i++)
        	{
        		if(oFileDataset.getColumn(i,"CHK")==1)
        		{
        			sFileId = oFileDataset.getColumn(i, "FILE_ID");
        			sFileSeq = oFileDataset.getColumn(i, "SEQ");			
        			
        			try{
        				if(!this._FORM_FILE_OBJ.binary)
        				{
        					system.execBrowser(encodeURI(application.services["svc"].url + "DownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq));
        				}
        				else
        				{
        					system.execBrowser(encodeURI(application.services["svc"].url + "BinaryDownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq));
        				}
        			} catch (e){
        				trace(e);
        				this.gfn_alert("파일다운로드에 실패하였습니다.");
        			}			
        		}
        	}	
        }

        
        /**
         * @class 단건파일실행
         * @param sFileId : 파일ID
         * @param sFileSeq : 파일SEQ(기본값 1)
         * @return None
         */ 
        this.gfn_executeFileSingle = function(sFileId,sFileSeq)
        {
        	if(Eco.isEmpty(sFileId)) return false;
        	
        	if(Eco.isEmpty(sFileSeq)) sFileSeq = '1';	
        	
        	try {
        		if(!this._FORM_FILE_OBJ.binary)
        		{
        			system.execBrowser(encodeURI(application.services["svc"].url + "DownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq));
        		}
        		else
        		{
        			system.execBrowser(encodeURI(application.services["svc"].url + "BinaryDownloadServlet?PATH="+this._FORM_FILE_OBJ.uploadpath+"&FILE_ID="+sFileId+"&SEQ="+sFileSeq));
        		}
        	} catch (e){
        		trace(e);
        		this.gfn_alert("파일다운로드에 실패하였습니다.");
        	}
        }
        });


    
        this.loadIncludeScript(path);
        
        obj = null;
    };
}
)();
