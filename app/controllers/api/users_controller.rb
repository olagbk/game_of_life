class Api::UsersController < ApplicationController
    def create
        @user = User.new(params[:user].permit(:name, :password))
        @user.save!

        respond_to do |format|
          format.json { render :json => @user }
        end
    end

    def verify
        user_params = params[:user].permit(:name, :password)
        @user = User.find_by(name: user_params[:name]).try(:authenticate, user_params[:password])
        if @user
          @token = LoginToken.new
          time = Time.new
          login_token = "catbakescookies" + time.to_s + @user.name
          login_token_hash = BCrypt::Password.create(login_token)
          @token.token = login_token_hash
          @token.user = @user
          @token.save!
        end

        respond_to do |format|
          format.json { render :json => @token }
        end
    end

  end
